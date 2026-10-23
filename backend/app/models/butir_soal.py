import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ButirSoal(Base):
    __tablename__ = "butir_soal"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    kisi_kisi_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("kisi_kisi.id"))
    pertanyaan: Mapped[str] = mapped_column(Text, default="")
    pilihan: Mapped[dict] = mapped_column(JSON, default=dict)
    kunci_jawaban: Mapped[str] = mapped_column(String(1), default="")
    pembahasan: Mapped[str] = mapped_column(Text, default="")
    level_bloom: Mapped[str] = mapped_column(String(2), default="")
    bobot_poin: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    ronde_saat_ini: Mapped[int] = mapped_column(Integer, default=0)
    percobaan_ke: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    alasan_tertunda: Mapped[str | None] = mapped_column(Text, nullable=True)
    prediksi_kesukaran: Mapped[float | None] = mapped_column(Float, nullable=True)
    rujukan_chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("materi_chunks.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
