import json
import asyncio
import logging
import re
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)


class AgentCallFailed(Exception):
    """Raised when an agent LLM call fails after all retries."""
    pass


_current_key_index = 0
MAX_RETRY_AFTER_SEC = 25


def _buat_client(timeout: float) -> httpx.AsyncClient:
    # Paksa IPv4: rute IPv6 ke api.groq.com/Cloudflare di jaringan ini lambat
    # atau timeout saat TLS handshake, sedangkan IPv4 tersambung < 1 detik.
    return httpx.AsyncClient(
        timeout=httpx.Timeout(timeout, connect=15.0),
        transport=httpx.AsyncHTTPTransport(local_address="0.0.0.0", retries=2),
    )


def extract_json(content: str) -> dict:
    """Extract valid JSON from LLM output, handling markdown blocks and pre/post-ambles."""
    content = content.strip()

    try:
        return json.loads(content)
    except Exception:
        pass

    fence_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
    matches = re.findall(fence_pattern, content, flags=re.IGNORECASE)
    for m in matches:
        try:
            return json.loads(m.strip())
        except Exception:
            pass

    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        snippet = content[start : end + 1]
        try:
            return json.loads(snippet)
        except Exception:
            pass

    raise json.JSONDecodeError("Cannot parse JSON from model output", content, 0)


def _get_next_key() -> tuple[str, int]:
    global _current_key_index
    settings = get_settings()
    keys = settings.get_openai_keys()
    if not keys:
        raise AgentCallFailed(
            "Tidak ada API key OpenAI yang diisi di file backend/.env"
        )
    idx = _current_key_index % len(keys)
    _current_key_index = (idx + 1) % len(keys)
    return keys[idx], idx


def _rotate_key():
    global _current_key_index
    settings = get_settings()
    keys = settings.get_openai_keys()
    if keys:
        _current_key_index = (_current_key_index + 1) % len(keys)


async def panggil_llm(
    provider: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1024,
    temperature: float = 0.7,
    max_retries: int = 4,
) -> dict:
    """
    Call an LLM API and parse the response as JSON.
    Supports:
    - 'sambanova': SambaNova Cloud API
    - 'groq': Groq Cloud API
    - 'openai': OpenAI API with multi-key rotation
    """
    settings = get_settings()

    if provider == "openai":
        keys = settings.get_openai_keys()
        total_keys = len(keys) if keys else 0
        if total_keys == 0:
            raise AgentCallFailed("Tidak ada API key OpenAI yang diisi di file backend/.env")

        base_url = "https://api.openai.com/v1"
        keys_tried = 0
        last_error = None

        for attempt in range(max_retries + 1):
            api_key, key_idx = _get_next_key()
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            try:
                async with _buat_client(120.0) as client:
                    response = await client.post(
                        f"{base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    if response.status_code in (429, 403):
                        error_body = response.text
                        last_error = f"Key #{key_idx + 1} mendapat {response.status_code}: {error_body[:200]}"
                        _rotate_key()
                        keys_tried += 1
                        if keys_tried >= total_keys:
                            retry_after_str = response.headers.get("retry-after")
                            wait_sec = min(float(retry_after_str) if retry_after_str else 10.0, MAX_RETRY_AFTER_SEC)
                            await asyncio.sleep(wait_sec)
                            keys_tried = 0
                        continue
                    if response.status_code in (500, 503):
                        last_error = f"OpenAI server error {response.status_code}"
                        await asyncio.sleep(5)
                        continue
                    response.raise_for_status()
                    data = response.json()
                    raw_content = data["choices"][0]["message"].get("content") or ""
                    return extract_json(raw_content)
            except httpx.TimeoutException as e:
                last_error = f"Timeout: {e}"
                _rotate_key()
                await asyncio.sleep(3)
                continue
            except (httpx.HTTPError, json.JSONDecodeError, KeyError, IndexError) as e:
                last_error = e
                if attempt < max_retries:
                    delay = min(3 + (attempt * 2), 10)
                    _rotate_key()
                    await asyncio.sleep(delay)
                    continue
        raise AgentCallFailed(f"Panggilan OpenAI gagal: {last_error}")

    elif provider == "groq":
        base_url = "https://api.groq.com/openai/v1"
        api_key = settings.GROQ_API_KEY
    elif provider == "sambanova":
        base_url = settings.SAMBANOVA_BASE_URL
        api_key = settings.SAMBANOVA_API_KEY
    else:
        raise ValueError(f"Provider tidak dikenali: {provider}")

    if not api_key:
        raise AgentCallFailed(
            f"API key untuk provider '{provider}' belum diisi. "
            f"Isi {'GROQ_API_KEY' if provider == 'groq' else 'SAMBANOVA_API_KEY'} di file backend/.env"
        )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    last_error = None
    for attempt in range(max_retries + 1):
        try:
            async with _buat_client(90.0) as client:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )

                if response.status_code == 429:
                    retry_after_str = response.headers.get("retry-after")
                    server_wait = float(retry_after_str) if retry_after_str else 5.0
                    wait_sec = min(server_wait, MAX_RETRY_AFTER_SEC)
                    last_error = f"Rate limit 429 untuk {provider}:{model}"
                    logger.warning(
                        f"Rate limit 429 for {provider}:{model}. "
                        f"Waiting {wait_sec}s (attempt {attempt + 1}/{max_retries + 1})"
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(wait_sec)
                        continue
                    break

                response.raise_for_status()
                data = response.json()
                raw_content = data["choices"][0]["message"].get("content") or ""
                if not raw_content.strip() and "reasoning" in data["choices"][0]["message"]:
                    raw_content = data["choices"][0]["message"]["reasoning"] or ""

                return extract_json(raw_content)

        except (httpx.HTTPError, json.JSONDecodeError, KeyError, IndexError) as e:
            last_error = e

            # Fallback jika SambaNova error dan ada Groq API key
            if provider == "sambanova" and settings.GROQ_API_KEY:
                try:
                    logger.info(f"SambaNova call failed ({e}), falling back to Groq")
                    return await panggil_llm(
                        provider="groq",
                        model=settings.GROQ_MODEL_KRITIKUS,
                        system_prompt=system_prompt,
                        user_prompt=user_prompt,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        max_retries=2,
                    )
                except Exception as fallback_err:
                    last_error = f"{e} (fallback Groq juga gagal: {fallback_err})"

            if attempt < max_retries:
                delay = min(3 + (attempt * 2), 10)
                logger.warning(f"LLM call failed ({e}). Retrying in {delay}s...")
                await asyncio.sleep(delay)
                continue

    raise AgentCallFailed(
        f"Panggilan LLM ({provider}:{model}) gagal setelah {max_retries + 1} percobaan: {last_error}"
    )
