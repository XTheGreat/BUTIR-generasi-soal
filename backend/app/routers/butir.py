import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.schemas.butir import ButirSoalResponse, ButirSoalUpdate, DebatLogResponse
from app.core.deps import get_current_guru

router = APIRouter(prefix="/api/butir", tags=["butir"])


@router.get("", response_model=list[ButirSoalResponse])
async def list_butir(
    status: str | None = Query(None),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    query = select(ButirSoal)
    if status:
        query = query.where(ButirSoal.status == status)
    query = query.order_by(ButirSoal.created_at.desc())
    result = await db.execute(query)
    return [ButirSoalResponse.model_validate(b) for b in result.scalars().all()]


@router.get("/{butir_id}/debat-log", response_model=list[DebatLogResponse])
async def get_debat_log(
    butir_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DebatLog)
        .where(DebatLog.butir_id == butir_id)
        .order_by(DebatLog.ronde, DebatLog.created_at)
    )
    return [DebatLogResponse.model_validate(log) for log in result.scalars().all()]


@router.patch("/{butir_id}", response_model=ButirSoalResponse)
async def update_butir(
    butir_id: uuid.UUID,
    data: ButirSoalUpdate,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ButirSoal).where(ButirSoal.id == butir_id))
    butir = result.scalar_one_or_none()
    if not butir:
        raise HTTPException(status_code=404, detail="Butir tidak ditemukan")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(butir, key, value)

    await db.commit()
    await db.refresh(butir)
    return ButirSoalResponse.model_validate(butir)
