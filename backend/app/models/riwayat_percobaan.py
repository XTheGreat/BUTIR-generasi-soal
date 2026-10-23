import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

# Nilai kolom `hasil`: berjalan | diterima | ditandai | ditolak | tertunda | dihentikan


class RiwayatPercobaan(Base):
    """Satu baris per percobaan debat sebuah butir (percobaan pertama + tiap retry)."""

    __tablename__ = "riwayat_percobaan"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    butir_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("butir_soal.id", ondelete="CASCADE"), index=True
    )
    percobaan_ke: Mapped[int] = mapped_column(Integer)
    hasil: Mapped[str] = mapped_column(String(20), default="berjalan")
    ronde_terakhir: Mapped[int] = mapped_column(Integer, default=0)
    alasan: Mapped[str | None] = mapped_column(Text, nullable=True)
    mulai: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    selesai: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
