import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Table, Column, JSON, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


kisi_kisi_materi = Table(
    "kisi_kisi_materi",
    Base.metadata,
    Column("kisi_kisi_id", Uuid, ForeignKey("kisi_kisi.id", ondelete="CASCADE"), primary_key=True),
    Column("materi_id", Uuid, ForeignKey("materi_ajar.id", ondelete="CASCADE"), primary_key=True),
)


class KisiKisi(Base):
    __tablename__ = "kisi_kisi"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    guru_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    jumlah_butir: Mapped[int] = mapped_column(Integer)
    distribusi_bloom: Mapped[dict] = mapped_column(JSON)
    cakupan_bab: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    materi_list: Mapped[list] = relationship(
        "Materi", secondary=kisi_kisi_materi, lazy="selectin"
    )
