import uuid
from datetime import datetime
from pydantic import BaseModel


class PaketUjianCreate(BaseModel):
    judul: str
    butir_ids: list[uuid.UUID]
    durasi_menit: int = 60


class PaketUjianTerbitkan(BaseModel):
    waktu_mulai: datetime
    waktu_selesai: datetime


class PaketUjianButirResponse(BaseModel):
    butir_id: uuid.UUID
    urutan: int

    model_config = {"from_attributes": True}


class PaketUjianResponse(BaseModel):
    id: uuid.UUID
    guru_id: uuid.UUID
    judul: str
    status: str
    kode_akses: str | None
    waktu_mulai: datetime | None
    waktu_selesai: datetime | None
    durasi_menit: int
    created_at: datetime
    butir_list: list[PaketUjianButirResponse] = []

    model_config = {"from_attributes": True}
