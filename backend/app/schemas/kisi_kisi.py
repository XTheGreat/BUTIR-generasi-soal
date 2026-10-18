import uuid
from datetime import datetime
from pydantic import BaseModel, model_validator


class KisiKisiCreate(BaseModel):
    jumlah_butir: int
    distribusi_bloom: dict[str, int]
    cakupan_bab: str | None = None
    materi_ids: list[uuid.UUID]

    @model_validator(mode="after")
    def validate_bloom_total(self):
        total = sum(self.distribusi_bloom.values())
        if total != 100:
            raise ValueError(f"Total distribusi Bloom harus 100%, saat ini {total}%")
        valid_levels = {"C1", "C2", "C3", "C4", "C5", "C6"}
        for key in self.distribusi_bloom:
            if key not in valid_levels:
                raise ValueError(f"Level Bloom tidak valid: {key}")
        return self


class KisiKisiResponse(BaseModel):
    id: uuid.UUID
    guru_id: uuid.UUID
    jumlah_butir: int
    distribusi_bloom: dict[str, int]
    cakupan_bab: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
