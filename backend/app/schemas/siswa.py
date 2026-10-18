import uuid
from datetime import datetime
from pydantic import BaseModel


class SiswaMasukRequest(BaseModel):
    kode_akses: str
    nama_siswa: str


class SiswaMasukResponse(BaseModel):
    paket_ujian_id: uuid.UUID
    nama_siswa: str
    judul_ujian: str
    durasi_menit: int
    waktu_selesai: datetime | None


class JawabanSimpan(BaseModel):
    butir_id: uuid.UUID
    jawaban_pilihan: str


class HasilUjianResponse(BaseModel):
    nama_siswa: str
    judul_ujian: str
    total_soal: int
    total_benar: int
    skor: float
    detail: list[dict]
