import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.kisi_kisi import KisiKisi
from app.models.butir_soal import ButirSoal
from app.schemas.butir import ButirSoalResponse
from app.core.deps import get_current_guru
from app.services.agents.orchestrator import jalankan_generasi, retry_butir_tertunda

router = APIRouter(prefix="/api/kisi-kisi", tags=["generasi"])


@router.post("/{kisi_kisi_id}/generate", status_code=202)
async def trigger_generation(
    kisi_kisi_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_kisi_id))
    kk = result.scalar_one_or_none()
    if not kk:
        raise HTTPException(status_code=404, detail="Kisi-kisi tidak ditemukan")
    if kk.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan kisi-kisi Anda")

    background_tasks.add_task(jalankan_generasi, kisi_kisi_id)
    return {"detail": "Generasi butir soal dimulai", "kisi_kisi_id": str(kisi_kisi_id)}


@router.get("/{kisi_kisi_id}/status")
async def get_generation_status(
    kisi_kisi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ButirSoal)
        .where(ButirSoal.kisi_kisi_id == kisi_kisi_id)
        .order_by(ButirSoal.created_at)
    )
    butir_list = result.scalars().all()

    items = []
    for b in butir_list:
        items.append({
            "id": str(b.id),
            "status": b.status,
            "level_bloom": b.level_bloom,
            "ronde_saat_ini": b.ronde_saat_ini,
            "pertanyaan": b.pertanyaan[:100] if b.pertanyaan else "",
        })

    total = len(items)
    selesai = sum(1 for i in items if i["status"] not in ("draft", "debating"))

    return {
        "kisi_kisi_id": str(kisi_kisi_id),
        "total": total,
        "selesai": selesai,
        "items": items,
    }


@router.post("/{kisi_kisi_id}/retry-tertunda", status_code=202)
async def retry_tertunda(
    kisi_kisi_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_kisi_id))
    kk = result.scalar_one_or_none()
    if not kk:
        raise HTTPException(status_code=404, detail="Kisi-kisi tidak ditemukan")
    if kk.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan kisi-kisi Anda")

    count_result = await db.execute(
        select(ButirSoal).where(
            ButirSoal.kisi_kisi_id == kisi_kisi_id,
            ButirSoal.status == "tertunda",
        )
    )
    tertunda_count = len(count_result.scalars().all())
    if tertunda_count == 0:
        raise HTTPException(status_code=400, detail="Tidak ada butir tertunda untuk di-retry")

    background_tasks.add_task(retry_butir_tertunda, kisi_kisi_id)
    return {
        "detail": f"Retry {tertunda_count} butir tertunda dimulai",
        "kisi_kisi_id": str(kisi_kisi_id),
        "tertunda_count": tertunda_count,
    }
