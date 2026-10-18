import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.butir_soal import ButirSoal
from app.schemas.butir import ButirSoalResponse
from app.core.deps import get_current_guru
import io
import json

router = APIRouter(prefix="/api/bank-soal", tags=["bank-soal"])


@router.get("", response_model=list[ButirSoalResponse])
async def list_bank_soal(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ButirSoal)
        .where(ButirSoal.status == "diterima")
        .order_by(ButirSoal.created_at.desc())
    )
    return [ButirSoalResponse.model_validate(b) for b in result.scalars().all()]


@router.delete("/{butir_id}")
async def delete_from_bank(
    butir_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ButirSoal).where(ButirSoal.id == butir_id))
    butir = result.scalar_one_or_none()
    if not butir:
        raise HTTPException(status_code=404, detail="Butir tidak ditemukan")
    await db.delete(butir)
    await db.commit()
    return {"detail": "Butir dihapus"}


@router.get("/export")
async def export_bank_soal(
    format: str = Query("json"),
    ids: str = Query(None),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    query = select(ButirSoal).where(ButirSoal.status == "diterima")
    if ids:
        id_list = [uuid.UUID(i.strip()) for i in ids.split(",")]
        query = query.where(ButirSoal.id.in_(id_list))

    result = await db.execute(query)
    butir_list = result.scalars().all()

    if format == "json":
        data = []
        for b in butir_list:
            data.append({
                "pertanyaan": b.pertanyaan,
                "pilihan": b.pilihan,
                "kunci_jawaban": b.kunci_jawaban,
                "pembahasan": b.pembahasan,
                "level_bloom": b.level_bloom,
                "bobot_poin": b.bobot_poin,
            })
        content = json.dumps(data, ensure_ascii=False, indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=bank_soal.json"},
        )
    else:
        lines = []
        for i, b in enumerate(butir_list, 1):
            lines.append(f"Soal {i}. [{b.level_bloom}] {b.pertanyaan}")
            for key in ["A", "B", "C", "D"]:
                lines.append(f"  {key}. {b.pilihan.get(key, '')}")
            lines.append(f"  Kunci: {b.kunci_jawaban}")
            lines.append(f"  Pembahasan: {b.pembahasan}")
            lines.append("")

        content = "\n".join(lines)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=bank_soal.txt"},
        )
