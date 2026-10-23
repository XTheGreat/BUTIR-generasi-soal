import json
from app.services.agents.base import panggil_llm
from app.config import get_settings


SYSTEM_PROMPT = (
    "Anda adalah Agen Penyusun dalam sistem BUTIR. "
    "Buat SATU butir soal pilihan ganda (4 opsi A-D) HANYA berdasarkan potongan materi berikut — "
    "jangan gunakan pengetahuan di luar materi ini. "
    "Target level kognitif Bloom: {target_level}. "
    "{revisi_instruksi}"
    "Materi: {chunk}. "
    "{format_rumus}"
    "Keluarkan HANYA JSON valid sesuai skema berikut, tanpa teks lain:\n"
    '{{"pertanyaan": "string", "pilihan": {{"A": "string", "B": "string", "C": "string", "D": "string"}}, '
    '"kunci_jawaban": "A|B|C|D", "pembahasan": "string", "level_bloom_usulan": "C1|C2|C3|C4|C5|C6"}}'
)

# Dipasang lewat argumen format() agar kurung kurawal LaTeX tidak dianggap placeholder.
FORMAT_RUMUS = (
    r"Format rumus: tulis setiap rumus matematika atau kimia dalam LaTeX yang diapit \( dan \), "
    r"misalnya \(x^2 + 3x\). Untuk zat dan reaksi kimia gunakan \ce{...} di dalam \( \), "
    r"misalnya \(\ce{Pb^2+(aq) + 2I^-(aq) -> PbI2(s)}\); jangan menyusun rumus kimia dengan \text{}. "
    r"Teks biasa tetap di luar pembatas. Karena keluaran berupa JSON, setiap backslash WAJIB ditulis "
    r"ganda (\\(, \\ce, \\frac). "
)

# JSON mengartikan \t \r \f \b sebagai karakter kontrol. Di teks soal itu hampir pasti
# LaTeX yang backslash-nya tidak digandakan (\text, \rightarrow, \frac, \beta).
_PULIHKAN_KONTROL = {
    "\t": r"\t",
    "\r": r"\r",
    "\f": r"\f",
    "\x08": r"\b",
}


def _pulihkan_backslash(teks):
    if not isinstance(teks, str):
        return teks
    for karakter, pengganti in _PULIHKAN_KONTROL.items():
        teks = teks.replace(karakter, pengganti)
    return teks


def _pulihkan_draft(draft: dict) -> dict:
    for kunci in ("pertanyaan", "pembahasan"):
        if kunci in draft:
            draft[kunci] = _pulihkan_backslash(draft[kunci])
    if isinstance(draft.get("pilihan"), dict):
        draft["pilihan"] = {k: _pulihkan_backslash(v) for k, v in draft["pilihan"].items()}
    return draft


async def jalankan(chunk: str, target_level: str, catatan_revisi: str | None = None) -> dict:
    settings = get_settings()

    revisi_instruksi = ""
    if catatan_revisi:
        revisi_instruksi = f"Ini ronde revisi. Perbaiki sesuai catatan berikut: {catatan_revisi}. "

    system_prompt = SYSTEM_PROMPT.format(
        target_level=target_level,
        revisi_instruksi=revisi_instruksi,
        chunk=chunk,
        format_rumus=FORMAT_RUMUS,
    )

    if settings.DEFAULT_PROVIDER == "openai" and settings.get_openai_keys():
        provider = "openai"
        model = settings.OPENAI_MODEL_PENYUSUN
    elif settings.DEFAULT_PROVIDER == "groq":
        provider = "groq"
        model = settings.GROQ_MODEL_PENYUSUN
    else:
        provider = "sambanova"
        model = settings.SAMBANOVA_MODEL_PENYUSUN

    result = await panggil_llm(
        provider=provider,
        model=model,
        system_prompt=system_prompt,
        user_prompt="Buatkan satu butir soal sesuai instruksi di atas.",
        max_tokens=1200,
    )
    return _pulihkan_draft(result)
