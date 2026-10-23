import json
from app.services.agents.base import panggil_llm
from app.config import get_settings


SYSTEM_PROMPT = (
    "Anda adalah Agen Arbiter. Baca draft butir soal, kritik dari Agen Kritikus, "
    "dan jawaban Agen Penjawab Buta. Putuskan verdict. "
    "Aturan: "
    "(1) Jika skor rata-rata rubrik >= 4 DAN jawaban Agen Penjawab Buta = kunci jawaban → 'diterima'. "
    "(2) Jika ada aspek lemah yang bisa diperbaiki → 'revisi' dengan alasan konkret. "
    "(3) Jika Agen Penjawab Buta salah menjawab padahal seharusnya jelas (indikasi ambigu) "
    "→ condong ke 'revisi', turunkan prediksi_kesukaran_final. "
    "(4) Ini ronde ke-{ronde} dari maksimal {max_ronde}. "
    "Draft: {draft_json}. "
    "Kritik: {kritikus_json}. "
    "Jawaban buta: {penjawab_json}. "
    "Keluarkan HANYA JSON valid sesuai skema berikut:\n"
    '{{"verdict": "diterima|revisi|ditolak", "alasan": "string", '
    '"level_bloom_final": "C1|C2|C3|C4|C5|C6", "bobot_poin_final": 1, '
    '"prediksi_kesukaran_final": 0.0}}'
)


async def jalankan(draft: dict, hasil_kritikus: dict, hasil_penjawab: dict, ronde: int) -> dict:
    settings = get_settings()

    system_prompt = SYSTEM_PROMPT.format(
        ronde=ronde,
        max_ronde=settings.MAX_RONDE_DEBAT,
        draft_json=json.dumps(draft, ensure_ascii=False),
        kritikus_json=json.dumps(hasil_kritikus, ensure_ascii=False),
        penjawab_json=json.dumps(hasil_penjawab, ensure_ascii=False),
    )

    if settings.DEFAULT_PROVIDER == "openai" and settings.get_openai_keys():
        provider = "openai"
        model = settings.OPENAI_MODEL_ARBITER
    elif settings.DEFAULT_PROVIDER == "groq":
        provider = "groq"
        model = settings.GROQ_MODEL_ARBITER
    else:
        provider = "sambanova"
        model = settings.SAMBANOVA_MODEL_ARBITER

    result = await panggil_llm(
        provider=provider,
        model=model,
        system_prompt=system_prompt,
        user_prompt="Berikan keputusan verdict untuk butir soal di atas.",
        max_tokens=400,
    )
    return result
