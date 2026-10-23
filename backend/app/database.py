from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import inspect, text
from app.config import get_settings

settings = get_settings()

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


# Database dibuat lewat create_all (bukan Alembic), yang tidak menambah kolom
# ke tabel lama. Daftar ini menambalnya secara idempoten saat startup.
_KOLOM_TAMBAHAN = [
    ("butir_soal", "percobaan_ke", "INTEGER NOT NULL DEFAULT 1"),
    ("butir_soal", "alasan_tertunda", "TEXT"),
    ("debat_log", "percobaan_ke", "INTEGER NOT NULL DEFAULT 1"),
]


def tambah_kolom_yang_hilang(sync_conn) -> None:
    insp = inspect(sync_conn)
    for tabel, kolom, ddl in _KOLOM_TAMBAHAN:
        ada = {c["name"] for c in insp.get_columns(tabel)}
        if kolom not in ada:
            sync_conn.execute(text(f"ALTER TABLE {tabel} ADD COLUMN {kolom} {ddl}"))


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
