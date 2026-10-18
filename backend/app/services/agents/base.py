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


GROQ_FALLBACK_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
]

MAX_RETRY_AFTER_SEC = 15


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


async def panggil_llm(
    provider: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 1024,
    max_retries: int = 4,
) -> dict:
    """
    Call an LLM API and parse the response as JSON.
    provider: 'groq' or 'sambanova'
    Retries up to max_retries times with rate limit handling and backoff.
    On 429, caps wait to MAX_RETRY_AFTER_SEC and tries fallback models.
    Raises AgentCallFailed if all retries fail.
    """
    settings = get_settings()

    if provider == "groq":
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

    if provider == "groq":
        models_to_try = [model] + [m for m in GROQ_FALLBACK_MODELS if m != model]
    else:
        models_to_try = [model]

    last_error = None

    for current_model in models_to_try:
        payload = {
            "model": current_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.7,
            "max_tokens": max_tokens,
        }

        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    response = await client.post(
                        f"{base_url}/chat/completions",
                        headers=headers,
                        json=payload,
                    )

                    if response.status_code == 429:
                        retry_after_str = response.headers.get("retry-after")
                        server_wait = float(retry_after_str) if retry_after_str else 5.0
                        wait_sec = min(server_wait, MAX_RETRY_AFTER_SEC)
                        last_error = (
                            f"Rate limit 429 untuk {provider}:{current_model} "
                            f"(server minta {server_wait}s, capped ke {wait_sec}s)"
                        )
                        logger.warning(
                            f"Rate limit 429 for {provider}:{current_model}. "
                            f"Waiting {wait_sec}s (server asked {server_wait}s, "
                            f"attempt {attempt + 1}/{max_retries + 1})"
                        )
                        if attempt < max_retries:
                            await asyncio.sleep(wait_sec)
                            continue
                        else:
                            logger.info(
                                f"Exhausted retries for {current_model}, trying next model..."
                            )
                            break

                    response.raise_for_status()
                    data = response.json()
                    raw_content = data["choices"][0]["message"].get("content") or ""
                    if not raw_content.strip() and "reasoning" in data["choices"][0]["message"]:
                        raw_content = data["choices"][0]["message"]["reasoning"] or ""

                    return extract_json(raw_content)


            except (httpx.HTTPError, json.JSONDecodeError, KeyError, IndexError) as e:
                last_error = e

                if provider == "sambanova" and settings.GROQ_API_KEY:
                    try:
                        logger.info(f"SambaNova call failed ({e}), falling back to Groq")
                        return await panggil_llm(
                            provider="groq",
                            model="qwen/qwen3.8-27b",
                            system_prompt=system_prompt,
                            user_prompt=user_prompt,
                            max_tokens=max_tokens,
                            max_retries=3,
                        )
                    except Exception as fallback_err:
                        last_error = f"{e} (fallback Groq juga gagal: {fallback_err})"

                if attempt < max_retries:
                    delay = min(3 + (attempt * 2), 10)
                    logger.warning(f"LLM call failed ({e}). Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                    continue

    raise AgentCallFailed(
        f"Panggilan LLM gagal setelah mencoba semua model: {last_error}"
    )

