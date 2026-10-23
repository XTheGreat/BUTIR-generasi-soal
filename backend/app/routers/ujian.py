import uuid
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.butir_soal import ButirSoal
from app.models.paket_ujian import PaketUjian, PaketUjianButir
from app.schemas.ujian import PaketUjianCreate, PaketUjianTerbitkan, PaketUjianResponse
from app.core.deps import get_current_guru

router = APIRouter(prefix="/api/ujian", tags=["ujian"])


@router.get("", response_model=list[PaketUjianResponse])
async def list_ujian(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian)
        .where(PaketUjian.guru_id == guru.id)
        .order_by(PaketUjian.created_at.desc())
    )
    return [PaketUjianResponse.model_validate(p) for p in result.scalars().all()]


@router.get("/{ujian_id}/peserta-count")
async def get_peserta_count(
    ujian_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    from app.models.jawaban_siswa import JawabanSiswa
    from sqlalchemy import func
    result = await db.execute(
        select(func.count(func.distinct(JawabanSiswa.nama_siswa)))
        .where(JawabanSiswa.paket_ujian_id == ujian_id)
    )
    return {"count": result.scalar() or 0}


@router.post("", response_model=PaketUjianResponse, status_code=201)
async def create_ujian(
    data: PaketUjianCreate,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    for bid in data.butir_ids:
        result = await db.execute(select(ButirSoal).where(ButirSoal.id == bid))
        butir = result.scalar_one_or_none()
        if not butir:
            raise HTTPException(status_code=404, detail=f"Butir {bid} tidak ditemukan")
        if butir.status != "diterima":
            raise HTTPException(status_code=400, detail=f"Butir {bid} belum diterima")

    paket = PaketUjian(
        guru_id=guru.id,
        judul=data.judul,
        durasi_menit=data.durasi_menit,
        status="draft",
    )
    db.add(paket)
    await db.flush()

    for i, bid in enumerate(data.butir_ids):
        item = PaketUjianButir(
            paket_ujian_id=paket.id,
            butir_id=bid,
            urutan=i + 1,
        )
        db.add(item)

    await db.commit()
    await db.refresh(paket)
    return PaketUjianResponse.model_validate(paket)


@router.get("/{ujian_id}", response_model=PaketUjianResponse)
async def get_ujian(
    ujian_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")
    return PaketUjianResponse.model_validate(paket)


@router.post("/{ujian_id}/terbitkan", response_model=PaketUjianResponse)
async def terbitkan_ujian(
    ujian_id: uuid.UUID,
    data: PaketUjianTerbitkan,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PaketUjian).where(PaketUjian.id == ujian_id))
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")
    if paket.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan ujian Anda")

    paket.status = "aktif"
    paket.kode_akses = secrets.token_hex(4).upper()
    paket.waktu_mulai = data.waktu_mulai
    paket.waktu_selesai = data.waktu_selesai

    await db.commit()
    await db.refresh(paket)
    return PaketUjianResponse.model_validate(paket)
