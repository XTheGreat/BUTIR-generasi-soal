import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.kisi_kisi import KisiKisi, kisi_kisi_materi
from app.models.materi import Materi
from app.schemas.kisi_kisi import KisiKisiCreate, KisiKisiResponse
from app.core.deps import get_current_guru

router = APIRouter(prefix="/api/kisi-kisi", tags=["kisi-kisi"])


@router.post("", response_model=KisiKisiResponse, status_code=201)
async def create_kisi_kisi(
    data: KisiKisiCreate,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    kk = KisiKisi(
        guru_id=guru.id,
        jumlah_butir=data.jumlah_butir,
        distribusi_bloom=data.distribusi_bloom,
        cakupan_bab=data.cakupan_bab,
    )
    db.add(kk)
    await db.flush()

    for materi_id in data.materi_ids:
        result = await db.execute(select(Materi).where(Materi.id == materi_id))
        materi = result.scalar_one_or_none()
        if not materi:
            raise HTTPException(status_code=404, detail=f"Materi {materi_id} tidak ditemukan")
        await db.execute(
            kisi_kisi_materi.insert().values(kisi_kisi_id=kk.id, materi_id=materi_id)
        )

    await db.commit()
    await db.refresh(kk)
    return KisiKisiResponse.model_validate(kk)


@router.get("/{kisi_kisi_id}", response_model=KisiKisiResponse)
async def get_kisi_kisi(
    kisi_kisi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_kisi_id))
    kk = result.scalar_one_or_none()
    if not kk:
        raise HTTPException(status_code=404, detail="Kisi-kisi tidak ditemukan")
    return KisiKisiResponse.model_validate(kk)
