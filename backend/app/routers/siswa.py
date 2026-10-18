import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.paket_ujian import PaketUjian, PaketUjianButir
from app.models.butir_soal import ButirSoal
from app.models.jawaban_siswa import JawabanSiswa
from app.schemas.siswa import SiswaMasukRequest, SiswaMasukResponse, JawabanSimpan, HasilUjianResponse
from app.schemas.butir import ButirSoalPublik

router = APIRouter(prefix="/api/siswa", tags=["siswa"])


@router.post("/masuk", response_model=SiswaMasukResponse)
async def siswa_masuk(
    data: SiswaMasukRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == data.kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Kode akses tidak ditemukan")
    if paket.status != "aktif":
        raise HTTPException(status_code=400, detail="Ujian tidak aktif")

    now = datetime.now(timezone.utc)
    if paket.waktu_selesai and now > paket.waktu_selesai:
        raise HTTPException(status_code=400, detail="Waktu ujian sudah berakhir")

    butir_result = await db.execute(
        select(PaketUjianButir)
        .where(PaketUjianButir.paket_ujian_id == paket.id)
        .order_by(PaketUjianButir.urutan)
    )
    paket_butir_list = butir_result.scalars().all()

    existing = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == paket.id,
            JawabanSiswa.nama_siswa == data.nama_siswa,
        )
    )
    if not existing.scalars().first():
        for pb in paket_butir_list:
            jawaban = JawabanSiswa(
                paket_ujian_id=paket.id,
                nama_siswa=data.nama_siswa,
                butir_id=pb.butir_id,
            )
            db.add(jawaban)
        await db.commit()

    return SiswaMasukResponse(
        paket_ujian_id=paket.id,
        nama_siswa=data.nama_siswa,
        judul_ujian=paket.judul,
        durasi_menit=paket.durasi_menit,
        waktu_selesai=paket.waktu_selesai,
    )


@router.get("/ujian/{kode_akses}/soal")
async def get_soal_ujian(
    kode_akses: str,
    nama_siswa: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")

    butir_result = await db.execute(
        select(PaketUjianButir)
        .where(PaketUjianButir.paket_ujian_id == paket.id)
        .order_by(PaketUjianButir.urutan)
    )
    paket_butir_list = butir_result.scalars().all()

    soal_list = []
    for pb in paket_butir_list:
        br = await db.execute(select(ButirSoal).where(ButirSoal.id == pb.butir_id))
        butir = br.scalar_one_or_none()
        if butir:
            soal_list.append({
                "id": str(butir.id),
                "pertanyaan": butir.pertanyaan,
                "pilihan": butir.pilihan,
                "level_bloom": butir.level_bloom,
                "bobot_poin": butir.bobot_poin,
                "urutan": pb.urutan,
            })

    jawaban_result = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == paket.id,
            JawabanSiswa.nama_siswa == nama_siswa,
        )
    )
    jawaban_list = jawaban_result.scalars().all()
    jawaban_map = {str(j.butir_id): j.jawaban_pilihan for j in jawaban_list}

    return {
        "paket_ujian_id": str(paket.id),
        "judul": paket.judul,
        "durasi_menit": paket.durasi_menit,
        "waktu_selesai": paket.waktu_selesai.isoformat() if paket.waktu_selesai else None,
        "soal": soal_list,
        "jawaban_tersimpan": jawaban_map,
    }


@router.post("/ujian/{kode_akses}/jawab")
async def simpan_jawaban(
    kode_akses: str,
    data: JawabanSimpan,
    nama_siswa: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")

    jawaban_result = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == paket.id,
            JawabanSiswa.nama_siswa == nama_siswa,
            JawabanSiswa.butir_id == data.butir_id,
        )
    )
    jawaban = jawaban_result.scalar_one_or_none()
    if not jawaban:
        jawaban = JawabanSiswa(
            paket_ujian_id=paket.id,
            nama_siswa=nama_siswa,
            butir_id=data.butir_id,
        )
        db.add(jawaban)

    if jawaban.submitted_at:
        raise HTTPException(status_code=400, detail="Jawaban sudah di-submit")

    jawaban.jawaban_pilihan = data.jawaban_pilihan
    await db.commit()
    return {"detail": "Jawaban disimpan"}


@router.post("/ujian/{kode_akses}/submit")
async def submit_ujian(
    kode_akses: str,
    nama_siswa: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")

    jawaban_result = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == paket.id,
            JawabanSiswa.nama_siswa == nama_siswa,
        )
    )
    jawaban_list = jawaban_result.scalars().all()

    now = datetime.now(timezone.utc)

    for jawaban in jawaban_list:
        if jawaban.submitted_at:
            continue
        butir_result = await db.execute(
            select(ButirSoal).where(ButirSoal.id == jawaban.butir_id)
        )
        butir = butir_result.scalar_one_or_none()
        if butir:
            jawaban.benar = (jawaban.jawaban_pilihan == butir.kunci_jawaban) if jawaban.jawaban_pilihan else False
        jawaban.submitted_at = now

    await db.commit()
    return {"detail": "Ujian berhasil di-submit"}


@router.get("/ujian/{kode_akses}/hasil", response_model=HasilUjianResponse)
async def get_hasil(
    kode_akses: str,
    nama_siswa: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PaketUjian).where(PaketUjian.kode_akses == kode_akses)
    )
    paket = result.scalar_one_or_none()
    if not paket:
        raise HTTPException(status_code=404, detail="Ujian tidak ditemukan")

    jawaban_result = await db.execute(
        select(JawabanSiswa).where(
            JawabanSiswa.paket_ujian_id == paket.id,
            JawabanSiswa.nama_siswa == nama_siswa,
        )
    )
    jawaban_list = jawaban_result.scalars().all()

    total_soal = len(jawaban_list)
    total_benar = sum(1 for j in jawaban_list if j.benar)

    detail = []
    for j in jawaban_list:
        butir_r = await db.execute(select(ButirSoal).where(ButirSoal.id == j.butir_id))
        butir = butir_r.scalar_one_or_none()
        detail.append({
            "butir_id": str(j.butir_id),
            "jawaban_siswa": j.jawaban_pilihan,
            "kunci_jawaban": butir.kunci_jawaban if butir else "",
            "benar": j.benar,
            "pertanyaan": butir.pertanyaan[:100] if butir else "",
        })

    skor = (total_benar / total_soal * 100) if total_soal > 0 else 0

    return HasilUjianResponse(
        nama_siswa=nama_siswa,
        judul_ujian=paket.judul,
        total_soal=total_soal,
        total_benar=total_benar,
        skor=round(skor, 2),
        detail=detail,
    )
