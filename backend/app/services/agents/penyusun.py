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
    "Keluarkan HANYA JSON valid sesuai skema berikut, tanpa teks lain:\n"
    '{{"pertanyaan": "string", "pilihan": {{"A": "string", "B": "string", "C": "string", "D": "string"}}, '
    '"kunci_jawaban": "A|B|C|D", "pembahasan": "string", "level_bloom_usulan": "C1|C2|C3|C4|C5|C6"}}'
)


async def jalankan(chunk: str, target_level: str, catatan_revisi: str | None = None) -> dict:
    settings = get_settings()

    revisi_instruksi = ""
    if catatan_revisi:
        revisi_instruksi = f"Ini ronde revisi. Perbaiki sesuai catatan berikut: {catatan_revisi}. "

    system_prompt = SYSTEM_PROMPT.format(
        target_level=target_level,
        revisi_instruksi=revisi_instruksi,
        chunk=chunk,
    )

    provider = settings.DEFAULT_PROVIDER
    if provider == "groq":
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
    return result



