import json
from app.services.agents.base import panggil_llm
from app.config import get_settings


SYSTEM_PROMPT = (
    "Anda adalah Agen Kritikus. Tugas Anda MENCARI KELEMAHAN pada butir soal berikut, "
    "bukan menyetujuinya. Nilai 5 aspek (skor 1-5): "
    "kesesuaian dengan materi sumber, kejelasan stem, kualitas pengecoh "
    "(apakah 3 opsi salah masuk akal, bukan asal-asalan), "
    "kesesuaian level kognitif target, bebas dari petunjuk tersembunyi "
    "(misal opsi benar lebih panjang/detail dari yang lain). "
    "Materi: {chunk}. "
    "Butir soal: {draft_json}. "
    "Keluarkan HANYA JSON valid sesuai skema berikut:\n"
    '{{"skor_rubrik": {{"kesesuaian_materi": 1, "kejelasan_stem": 1, "kualitas_pengecoh": 1, '
    '"kesesuaian_level_kognitif": 1, "bebas_petunjuk": 1}}, '
    '"catatan_kritik": "string", "usulan_perbaikan": "string"}}'
)


async def jalankan(chunk: str, draft: dict) -> dict:
    settings = get_settings()

    system_prompt = SYSTEM_PROMPT.format(
        chunk=chunk,
        draft_json=json.dumps(draft, ensure_ascii=False),
    )

    result = await panggil_llm(
        provider="groq",
        model=settings.GROQ_MODEL_KRITIKUS,
        system_prompt=system_prompt,
        user_prompt="Berikan kritik terhadap butir soal di atas.",
        max_tokens=600,
    )
    return result

