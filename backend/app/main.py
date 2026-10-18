from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, materi, kisi_kisi, generasi, butir, bank_soal, ujian, siswa, laporan
from app.database import engine, Base

import app.models.user  # noqa: F401
import app.models.materi  # noqa: F401
import app.models.kisi_kisi  # noqa: F401
import app.models.butir_soal  # noqa: F401
import app.models.debat_log  # noqa: F401
import app.models.paket_ujian  # noqa: F401
import app.models.jawaban_siswa  # noqa: F401

settings = get_settings()

app = FastAPI(title="BUTIR API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(materi.router)
app.include_router(kisi_kisi.router)
app.include_router(generasi.router)
app.include_router(butir.router)
app.include_router(bank_soal.router)
app.include_router(ujian.router)
app.include_router(siswa.router)
app.include_router(laporan.router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {"message": "BUTIR API v1.0"}

