import json
from app.services.agents.base import panggil_llm
from app.config import get_settings


SYSTEM_PROMPT = (
    "Anda adalah Agen Penjawab Buta. Anda TIDAK diberi tahu kunci jawaban. "
    "Jawab soal berikut seolah Anda siswa yang mengerjakan ujian berdasarkan pemahaman Anda sendiri. "
    "Pertanyaan: {pertanyaan}. "
    "A. {A} "
    "B. {B} "
    "C. {C} "
    "D. {D}. "
    "Keluarkan HANYA JSON valid sesuai skema berikut:\n"
    '{{"jawaban_pilihan": "A|B|C|D", "tingkat_keyakinan": 1, "alasan_singkat": "string"}}'
)


async def jalankan(draft: dict) -> dict:
    settings = get_settings()

    pilihan = draft.get("pilihan", {})
    system_prompt = SYSTEM_PROMPT.format(
        pertanyaan=draft.get("pertanyaan", ""),
        A=pilihan.get("A", ""),
        B=pilihan.get("B", ""),
        C=pilihan.get("C", ""),
        D=pilihan.get("D", ""),
    )

    result = await panggil_llm(
        provider="groq",
        model=settings.GROQ_MODEL_PENJAWAB_BUTA,
        system_prompt=system_prompt,
        user_prompt="Jawab soal di atas.",
        max_tokens=600,
    )
    return result


