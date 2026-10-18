import uuid
from datetime import datetime
from pydantic import BaseModel


class ButirSoalResponse(BaseModel):
    id: uuid.UUID
    kisi_kisi_id: uuid.UUID
    pertanyaan: str
    pilihan: dict[str, str]
    kunci_jawaban: str
    pembahasan: str
    level_bloom: str
    bobot_poin: int
    status: str
    ronde_saat_ini: int
    prediksi_kesukaran: float | None
    rujukan_chunk_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ButirSoalPublik(BaseModel):
    """Response schema for students — hides kunci_jawaban and pembahasan."""

    id: uuid.UUID
    pertanyaan: str
    pilihan: dict[str, str]
    level_bloom: str
    bobot_poin: int

    model_config = {"from_attributes": True}


class ButirSoalUpdate(BaseModel):
    pertanyaan: str | None = None
    pilihan: dict[str, str] | None = None
    kunci_jawaban: str | None = None
    pembahasan: str | None = None
    level_bloom: str | None = None
    bobot_poin: int | None = None
    status: str | None = None


class DebatLogResponse(BaseModel):
    id: uuid.UUID
    butir_id: uuid.UUID
    ronde: int
    agen: str
    output_json: dict
    created_at: datetime

    model_config = {"from_attributes": True}
