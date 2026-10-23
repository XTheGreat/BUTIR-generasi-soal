import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.materi import Materi, MateriChunk
from app.schemas.materi import MateriResponse
from app.core.deps import get_current_guru
from app.services.chunking import chunk_text
from app.services.pdf_converter import convert_pdf_to_markdown
import os

router = APIRouter(prefix="/api/materi", tags=["materi"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("", response_model=MateriResponse, status_code=201)
async def upload_materi(
    judul: str = Form(...),
    file: UploadFile = File(...),
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    file_id = uuid.uuid4()
    original_filename = file.filename or "materi"
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{original_filename}")
    content_bytes = await file.read()
    with open(file_path, "wb") as f:
        f.write(content_bytes)

    is_pdf = original_filename.lower().endswith(".pdf")
    if is_pdf:
        try:
            text_content = convert_pdf_to_markdown(content_bytes, filename=original_filename)
            md_path = f"{file_path}.md"
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(text_content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=400, 
                detail=f"Gagal mengonversi berkas PDF: {e}"
            )
    else:
        try:
            text_content = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text_content = content_bytes.decode("latin-1")

    if not text_content or not text_content.strip():
        raise HTTPException(
            status_code=400,
            detail="Berkas tidak memiliki isi teks yang dapat diproses."
        )

    materi = Materi(guru_id=guru.id, judul=judul, file_path=file_path)

    db.add(materi)
    await db.flush()

    chunks = chunk_text(text_content)
    for i, chunk_content in enumerate(chunks):
        chunk = MateriChunk(
            materi_id=materi.id,
            chunk_index=i,
            content=chunk_content,
        )
        db.add(chunk)

    await db.commit()
    await db.refresh(materi)
    return MateriResponse.model_validate(materi)


@router.get("", response_model=list[MateriResponse])
async def list_materi(
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Materi).where(Materi.guru_id == guru.id).order_by(Materi.created_at.desc())
    )
    return [MateriResponse.model_validate(m) for m in result.scalars().all()]


@router.get("/{materi_id}/chunks-count")
async def get_chunks_count(
    materi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Materi).where(Materi.id == materi_id))
    materi = result.scalar_one_or_none()
    if not materi:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")
    if materi.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan materi Anda")

    chunks = await db.execute(
        select(MateriChunk).where(MateriChunk.materi_id == materi_id)
    )
    return {"count": len(chunks.scalars().all())}


@router.delete("/{materi_id}", status_code=204)
async def delete_materi(
    materi_id: uuid.UUID,
    guru: User = Depends(get_current_guru),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Materi).where(Materi.id == materi_id))
    materi = result.scalar_one_or_none()
    if not materi:
        raise HTTPException(status_code=404, detail="Materi tidak ditemukan")
    if materi.guru_id != guru.id:
        raise HTTPException(status_code=403, detail="Bukan materi Anda")

    if materi.file_path and os.path.exists(materi.file_path):
        os.remove(materi.file_path)
        md_path = f"{materi.file_path}.md"
        if os.path.exists(md_path):
            os.remove(md_path)

    await db.execute(
        select(MateriChunk).where(MateriChunk.materi_id == materi_id)
    )
    from sqlalchemy import delete as sql_delete
    await db.execute(
        sql_delete(MateriChunk).where(MateriChunk.materi_id == materi_id)
    )

    await db.delete(materi)
    await db.commit()

