import asyncio
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.database import async_session
from app.models.kisi_kisi import KisiKisi, kisi_kisi_materi
from app.models.materi import MateriChunk
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.models.riwayat_percobaan import RiwayatPercobaan
from app.services.agents import penyusun, kritikus, penjawab_buta, arbiter
from app.services.agents.base import AgentCallFailed
from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_CONCURRENT_BUTIR = 1
_generation_lock: asyncio.Lock | None = None

_active_generation_tasks: dict[str, asyncio.Task] = {}
_cancel_requested: set[str] = set()

ALASAN_DIHENTIKAN = "Dihentikan oleh guru"
ALASAN_TERPUTUS = "Proses terputus karena server dimulai ulang"


def get_generation_lock() -> asyncio.Lock:
    global _generation_lock
    if _generation_lock is None:
        _generation_lock = asyncio.Lock()
    return _generation_lock


def is_cancelled(kisi_kisi_id: uuid.UUID | None) -> bool:
    if not kisi_kisi_id:
        return False
    return str(kisi_kisi_id) in _cancel_requested


async def pulihkan_proses_terputus():
    """
    Dipanggil saat startup. Setelah server mati/restart tidak ada proses debat yang
    benar-benar berjalan, jadi butir 'draft'/'debating' yang tersisa dijadikan
    'tertunda' agar bisa diulang dari halaman Butir Tertunda.
    """
    sekarang = datetime.now(timezone.utc)
    async with async_session() as db:
        await db.execute(
            update(ButirSoal)
            .where(ButirSoal.status.in_(["draft", "debating"]))
            .values(status="tertunda", alasan_tertunda=ALASAN_TERPUTUS)
        )
        await db.execute(
            update(RiwayatPercobaan)
            .where(RiwayatPercobaan.hasil == "berjalan")
            .values(hasil="tertunda", alasan=ALASAN_TERPUTUS, selesai=sekarang)
        )
        await db.commit()


async def stop_generasi_kisi_kisi(kisi_kisi_id: uuid.UUID):
    """
    Hentikan seluruh proses generasi/debat untuk kisi-kisi tertentu.
    Semua butir yang sudah jadi ('diterima', 'ditandai', 'ditolak') TETAP DIPERTAHANKAN.
    Butir yang sedang berjalan ('debating') atau belum ('draft') diubah menjadi 'tertunda'.
    """
    kisi_id_str = str(kisi_kisi_id)
    _cancel_requested.add(kisi_id_str)

    task = _active_generation_tasks.get(kisi_id_str)
    if task and not task.done():
        logger.info(f"Membatalkan background task untuk kisi-kisi {kisi_id_str}")
        task.cancel()

    async with async_session() as db:
        result = await db.execute(
            select(ButirSoal).where(
                ButirSoal.kisi_kisi_id == kisi_kisi_id,
                ButirSoal.status.in_(["debating", "draft"]),
            )
        )
        unfinished_butir = result.scalars().all()
        for b in unfinished_butir:
            b.status = "tertunda"
            b.alasan_tertunda = ALASAN_DIHENTIKAN
            b.updated_at = datetime.now(timezone.utc)
        await db.commit()

    await asyncio.sleep(0.3)
    _cancel_requested.discard(kisi_id_str)
    _active_generation_tasks.pop(kisi_id_str, None)
    logger.info(f"Generasi untuk kisi-kisi {kisi_id_str} berhasil dihentikan.")


async def simpan_debat_log(
    db: AsyncSession, butir_id: uuid.UUID, percobaan_ke: int, ronde: int, agen: str, output: dict
):
    log = DebatLog(
        butir_id=butir_id,
        percobaan_ke=percobaan_ke,
        ronde=ronde,
        agen=agen,
        output_json=output,
    )
    db.add(log)
    await db.commit()


async def _harus_berhenti(butir_id: uuid.UUID, kisi_kisi_id: uuid.UUID | None) -> bool:
    """
    Titik cek pembatalan. Menghentikan butir (per butir maupun per kisi-kisi) cukup
    dengan mengubah statusnya dari 'debating' di database. Dibaca lewat sesi singkat
    terpisah agar tidak menahan kunci baca SQLite selama panggilan LLM yang lama.
    """
    if is_cancelled(kisi_kisi_id):
        return True
    async with async_session() as db:
        status = (
            await db.execute(select(ButirSoal.status).where(ButirSoal.id == butir_id))
        ).scalar_one_or_none()
    return status != "debating"


async def _tutup_percobaan(
    db: AsyncSession, riwayat: RiwayatPercobaan, butir: ButirSoal, hasil: str, alasan: str | None = None
):
    riwayat.hasil = hasil
    riwayat.ronde_terakhir = butir.ronde_saat_ini
    riwayat.alasan = alasan
    riwayat.selesai = datetime.now(timezone.utc)
    await db.commit()


async def _berhenti(db: AsyncSession, butir: ButirSoal, riwayat: RiwayatPercobaan):
    butir.status = "tertunda"
    butir.alasan_tertunda = butir.alasan_tertunda or ALASAN_DIHENTIKAN
    butir.updated_at = datetime.now(timezone.utc)
    await _tutup_percobaan(db, riwayat, butir, "dihentikan", ALASAN_DIHENTIKAN)


def _ringkas_error(e: Exception) -> str:
    return str(e).strip()[:300] or e.__class__.__name__


async def proses_satu_butir(
    butir_id: uuid.UUID,
    target_level_bloom: str,
    chunk_content: str,
    kisi_kisi_id: uuid.UUID | None = None,
):
    """Process a single (already-created, status 'draft') butir through the full debate pipeline."""
    if is_cancelled(kisi_kisi_id):
        return

    settings = get_settings()
    max_ronde = settings.MAX_RONDE_DEBAT

    async with async_session() as db:
        result = await db.execute(select(ButirSoal).where(ButirSoal.id == butir_id))
        butir = result.scalar_one_or_none()
        if not butir:
            logger.error(f"ButirSoal {butir_id} not found")
            return
        # Hanya butir antrean yang boleh diproses: yang sudah dihentikan guru atau
        # sedang dikerjakan proses lain dilewati.
        if butir.status != "draft":
            return

        butir.status = "debating"
        butir.alasan_tertunda = None
        percobaan_ke = butir.percobaan_ke
        riwayat = RiwayatPercobaan(butir_id=butir.id, percobaan_ke=percobaan_ke)
        db.add(riwayat)
        await db.commit()

        catatan_revisi = None

        try:
            for ronde in range(1, max_ronde + 1):
                if await _harus_berhenti(butir_id, kisi_kisi_id):
                    await _berhenti(db, butir, riwayat)
                    return

                butir.ronde_saat_ini = ronde
                await db.commit()

                try:
                    draft = await penyusun.jalankan(chunk_content, target_level_bloom, catatan_revisi)
                    await simpan_debat_log(db, butir.id, percobaan_ke, ronde, "penyusun", draft)
                    await asyncio.sleep(0.3)

                    if await _harus_berhenti(butir_id, kisi_kisi_id):
                        await _berhenti(db, butir, riwayat)
                        return

                    hasil_kritikus, hasil_penjawab = await asyncio.gather(
                        kritikus.jalankan(chunk_content, draft),
                        penjawab_buta.jalankan(draft),
                    )
                    await simpan_debat_log(db, butir.id, percobaan_ke, ronde, "kritikus", hasil_kritikus)
                    await simpan_debat_log(db, butir.id, percobaan_ke, ronde, "penjawab_buta", hasil_penjawab)
                    await asyncio.sleep(0.3)

                    if await _harus_berhenti(butir_id, kisi_kisi_id):
                        await _berhenti(db, butir, riwayat)
                        return

                    keputusan = await arbiter.jalankan(draft, hasil_kritikus, hasil_penjawab, ronde)
                    await simpan_debat_log(db, butir.id, percobaan_ke, ronde, "arbiter", keputusan)
                    await asyncio.sleep(0.3)

                    if await _harus_berhenti(butir_id, kisi_kisi_id):
                        await _berhenti(db, butir, riwayat)
                        return

                    verdict = keputusan.get("verdict", "revisi")

                    if verdict == "diterima":
                        butir.status = "diterima"
                        butir.pertanyaan = draft.get("pertanyaan", "")
                        butir.pilihan = draft.get("pilihan", {})
                        butir.kunci_jawaban = draft.get("kunci_jawaban", "")
                        butir.pembahasan = draft.get("pembahasan", "")
                        butir.level_bloom = keputusan.get("level_bloom_final", target_level_bloom)
                        butir.bobot_poin = keputusan.get("bobot_poin_final", 1)
                        butir.prediksi_kesukaran = keputusan.get("prediksi_kesukaran_final")
                        break
                    elif verdict == "ditolak":
                        butir.status = "ditolak"
                        butir.pertanyaan = draft.get("pertanyaan", "")
                        butir.pilihan = draft.get("pilihan", {})
                        butir.kunci_jawaban = draft.get("kunci_jawaban", "")
                        butir.pembahasan = draft.get("pembahasan", "")
                        break
                    else:
                        if ronde == max_ronde:
                            butir.status = "ditandai"
                            butir.pertanyaan = draft.get("pertanyaan", "")
                            butir.pilihan = draft.get("pilihan", {})
                            butir.kunci_jawaban = draft.get("kunci_jawaban", "")
                            butir.pembahasan = draft.get("pembahasan", "")
                            butir.level_bloom = keputusan.get("level_bloom_final", target_level_bloom)
                            butir.bobot_poin = keputusan.get("bobot_poin_final", 1)
                            butir.prediksi_kesukaran = keputusan.get("prediksi_kesukaran_final")
                        else:
                            catatan_revisi = (
                                keputusan.get("alasan", "")
                                + " "
                                + hasil_kritikus.get("usulan_perbaikan", "")
                            )
                            continue

                except AgentCallFailed as e:
                    logger.error(f"Agent call failed for butir {butir.id}: {e}")
                    butir.status = "tertunda"
                    butir.alasan_tertunda = _ringkas_error(e)
                    break
                except Exception as e:
                    logger.error(f"Unexpected error for butir {butir.id}: {e}")
                    butir.status = "tertunda"
                    butir.alasan_tertunda = _ringkas_error(e)
                    break
        except asyncio.CancelledError:
            await _berhenti(db, butir, riwayat)
            raise

        butir.updated_at = datetime.now(timezone.utc)
        await _tutup_percobaan(
            db, riwayat, butir, butir.status,
            butir.alasan_tertunda if butir.status == "tertunda" else None,
        )


def distribute_bloom_levels(jumlah_butir: int, distribusi_bloom: dict) -> list[str]:
    """
    Convert bloom distribution percentages to a list of target levels.
    """
    levels = []
    remaining = jumlah_butir

    items = sorted(distribusi_bloom.items())
    for i, (level, pct) in enumerate(items):
        if i == len(items) - 1:
            count = remaining
        else:
            count = round(jumlah_butir * pct / 100)
            remaining -= count
        levels.extend([level] * count)

    while len(levels) < jumlah_butir:
        levels.append(items[-1][0])
    levels = levels[:jumlah_butir]

    return levels


async def jalankan_generasi(kisi_kisi_id: uuid.UUID):
    """
    Main entry point: generate all butir for a kisi-kisi.
    """
    kisi_id_str = str(kisi_kisi_id)
    current_task = asyncio.current_task()
    if current_task:
        _active_generation_tasks[kisi_id_str] = current_task

    try:
        async with get_generation_lock():
            if is_cancelled(kisi_kisi_id):
                return

            async with async_session() as db:
                result = await db.execute(select(KisiKisi).where(KisiKisi.id == kisi_kisi_id))
                kk = result.scalar_one_or_none()
                if not kk:
                    logger.error(f"KisiKisi {kisi_kisi_id} not found")
                    return

                materi_result = await db.execute(
                    select(kisi_kisi_materi.c.materi_id).where(
                        kisi_kisi_materi.c.kisi_kisi_id == kisi_kisi_id
                    )
                )
                materi_ids = [row[0] for row in materi_result.fetchall()]

                chunks_result = await db.execute(
                    select(MateriChunk)
                    .where(MateriChunk.materi_id.in_(materi_ids))
                    .order_by(MateriChunk.chunk_index)
                )
                chunks = chunks_result.scalars().all()

                if not chunks:
                    logger.error(f"No chunks found for kisi-kisi {kisi_kisi_id}")
                    return

                target_levels = distribute_bloom_levels(kk.jumlah_butir, kk.distribusi_bloom)
                chunk_data = [(c.id, c.content) for c in chunks]

                butir_plan = []
                for i, level in enumerate(target_levels):
                    chunk_id, chunk_content = chunk_data[i % len(chunk_data)]
                    butir = ButirSoal(
                        kisi_kisi_id=kisi_kisi_id,
                        status="draft",
                        ronde_saat_ini=0,
                        level_bloom=level,
                        rujukan_chunk_id=chunk_id,
                    )
                    db.add(butir)
                    butir_plan.append((butir, level, chunk_content))

                await db.commit()

                for butir, _, _ in butir_plan:
                    await db.refresh(butir)

                plan_data = [
                    (butir.id, level, chunk_content)
                    for butir, level, chunk_content in butir_plan
                ]

            logger.info(
                f"Created {len(plan_data)} draft butir for kisi-kisi {kisi_kisi_id}. "
                f"Starting debate processing..."
            )

            for i, (butir_id, level, chunk_content) in enumerate(plan_data):
                if is_cancelled(kisi_kisi_id):
                    logger.info(f"Generasi dihentikan di butir {i+1} untuk {kisi_id_str}")
                    break
                await proses_satu_butir(butir_id, level, chunk_content, kisi_kisi_id)
                if i < len(plan_data) - 1:
                    await asyncio.sleep(1.0)

            logger.info(f"Generation complete for kisi-kisi {kisi_kisi_id}")

    except asyncio.CancelledError:
        logger.info(f"Task generasi dibatalkan: {kisi_id_str}")
    finally:
        _active_generation_tasks.pop(kisi_id_str, None)
        _cancel_requested.discard(kisi_id_str)


async def antrekan_retry(db: AsyncSession, butir_list: list[ButirSoal]) -> list[uuid.UUID]:
    """
    Siapkan butir 'tertunda' untuk percobaan baru: status kembali 'draft' (antrean) dan
    nomor percobaan naik. Riwayat dan log debat percobaan lama TIDAK dihapus.
    Pemanggil wajib mengecek kepemilikan dan status, lalu menjalankan
    jalankan_antrean_retry() dengan id yang dikembalikan.
    """
    if not butir_list:
        return []

    ids = [b.id for b in butir_list]
    # Butir lama (sebelum ada riwayat) hanya punya debat_log, jadi keduanya dicek.
    percobaan_terakhir: dict[uuid.UUID, int] = {}
    for model in (RiwayatPercobaan, DebatLog):
        rows = await db.execute(
            select(model.butir_id, func.max(model.percobaan_ke))
            .where(model.butir_id.in_(ids))
            .group_by(model.butir_id)
        )
        for butir_id, maks in rows.all():
            percobaan_terakhir[butir_id] = max(percobaan_terakhir.get(butir_id, 0), maks)

    for b in butir_list:
        # Minimal 2: retry selalu terhitung percobaan ulang, dan halaman Butir
        # Tertunda mengenali butir yang sedang diulang lewat percobaan_ke > 1.
        b.percobaan_ke = max(percobaan_terakhir.get(b.id, 0) + 1, 2)
        b.status = "draft"
        b.ronde_saat_ini = 0
        b.alasan_tertunda = None
    await db.commit()
    return ids


async def jalankan_antrean_retry(butir_ids: list[uuid.UUID]):
    """
    Proses butir antrean satu per satu. Kunci generasi diambil PER BUTIR (bukan selama
    seluruh antrean), sehingga pembuatan soal baru yang sedang menunggu bisa menyelip
    di antara butir yang diulang, dan tidak tertahan oleh antrean lama.
    """
    for i, butir_id in enumerate(butir_ids):
        async with get_generation_lock():
            async with async_session() as db:
                butir = (
                    await db.execute(select(ButirSoal).where(ButirSoal.id == butir_id))
                ).scalar_one_or_none()
                if not butir or butir.status != "draft":
                    continue  # dihentikan guru saat masih mengantre

                chunk_content = ""
                if butir.rujukan_chunk_id:
                    chunk = (
                        await db.execute(
                            select(MateriChunk).where(MateriChunk.id == butir.rujukan_chunk_id)
                        )
                    ).scalar_one_or_none()
                    if chunk:
                        chunk_content = chunk.content
                level = butir.level_bloom
                kisi_kisi_id = butir.kisi_kisi_id

            await proses_satu_butir(butir_id, level, chunk_content, kisi_kisi_id)

        if i < len(butir_ids) - 1:
            await asyncio.sleep(1.0)
