import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PaketUjianButir(Base):
    __tablename__ = "paket_ujian_butir"

    paket_ujian_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("paket_ujian.id", ondelete="CASCADE"), primary_key=True
    )
    butir_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("butir_soal.id", ondelete="CASCADE"), primary_key=True
    )
    urutan: Mapped[int] = mapped_column(Integer)


class PaketUjian(Base):
    __tablename__ = "paket_ujian"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    guru_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    judul: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(20), default="draft")
    kode_akses: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    waktu_mulai: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    waktu_selesai: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    durasi_menit: Mapped[int] = mapped_column(Integer, default=60)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    butir_list: Mapped[list["PaketUjianButir"]] = relationship(
        cascade="all, delete-orphan", lazy="selectin"
    )
