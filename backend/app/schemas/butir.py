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


class ButirTertundaResponse(BaseModel):
    id: uuid.UUID
    kisi_kisi_id: uuid.UUID
    kisi_kisi_label: str
    level_bloom: str
    status: str
    ronde_saat_ini: int
    percobaan_ke: int
    alasan_tertunda: str | None
    updated_at: datetime


class HistoryButirItem(BaseModel):
    id: uuid.UUID
    level_bloom: str
    status: str
    ronde_saat_ini: int
    percobaan_ke: int
    pertanyaan: str
    # Hanya terisi pada mode lengkap (halaman History), bukan pratinjau sidebar.
    pilihan: dict[str, str] | None = None
    kunci_jawaban: str | None = None
    pembahasan: str | None = None


class HistoryDebatTerakhir(BaseModel):
    """Ringkasan read-only dari generasi (kisi-kisi) terakhir yang sudah selesai diproses."""

    kisi_kisi_id: uuid.UUID
    label: str
    mulai: datetime
    selesai: datetime
    total: int
    hitung: dict[str, int]
    items: list[HistoryButirItem]


class RiwayatPercobaanResponse(BaseModel):
    id: uuid.UUID
    percobaan_ke: int
    hasil: str
    ronde_terakhir: int
    alasan: str | None
    mulai: datetime
    selesai: datetime | None

    model_config = {"from_attributes": True}


class DebatLogResponse(BaseModel):
    id: uuid.UUID
    butir_id: uuid.UUID
    percobaan_ke: int
    ronde: int
    agen: str
    output_json: dict
    created_at: datetime

    model_config = {"from_attributes": True}
