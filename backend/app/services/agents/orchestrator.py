import asyncio
import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import async_session
from app.models.kisi_kisi import KisiKisi, kisi_kisi_materi
from app.models.materi import Materi, MateriChunk
from app.models.butir_soal import ButirSoal
from app.models.debat_log import DebatLog
from app.services.agents import penyusun, kritikus, penjawab_buta, arbiter
from app.services.agents.base import AgentCallFailed
from app.config import get_settings
import random

logger = logging.getLogger(__name__)

MAX_CONCURRENT_BUTIR = 1
_generation_lock: asyncio.Lock | None = None


def get_generation_lock() -> asyncio.Lock:
    global _generation_lock
    if _generation_lock is None:
        _generation_lock = asyncio.Lock()
    return _generation_lock





async def simpan_debat_log(db: AsyncSession, butir_id: uuid.UUID, ronde: int, agen: str, output: dict):
    log = DebatLog(
        butir_id=butir_id,
        ronde=ronde,
        agen=agen,
        output_json=output,
    )
    db.add(log)
    await db.commit()


async def proses_satu_butir(
    butir_id: uuid.UUID,
    target_level_bloom: str,
    chunk_content: str,
):
    """Process a single (already-created) butir through the full debate pipeline."""
    settings = get_settings()
    max_ronde = settings.MAX_RONDE_DEBAT

    async with async_session() as db:
        result = await db.execute(select(ButirSoal).where(ButirSoal.id == butir_id))
        butir = result.scalar_one_or_none()
        if not butir:
            logger.error(f"ButirSoal {butir_id} not found")
            return

        butir.status = "debating"
        await db.commit()

        catatan_revisi = None

        for ronde in range(1, max_ronde + 1):
            butir.ronde_saat_ini = ronde
            await db.commit()

            try:
                draft = await penyusun.jalankan(chunk_content, target_level_bloom, catatan_revisi)
                await simpan_debat_log(db, butir.id, ronde, "penyusun", draft)
                await asyncio.sleep(0.3)

                hasil_kritikus, hasil_penjawab = await asyncio.gather(
                    kritikus.jalankan(chunk_content, draft),
                    penjawab_buta.jalankan(draft),
                )
                await simpan_debat_log(db, butir.id, ronde, "kritikus", hasil_kritikus)
                await simpan_debat_log(db, butir.id, ronde, "penjawab_buta", hasil_penjawab)
                await asyncio.sleep(0.3)

                keputusan = await arbiter.jalankan(draft, hasil_kritikus, hasil_penjawab, ronde)
                await simpan_debat_log(db, butir.id, ronde, "arbiter", keputusan)
                await asyncio.sleep(0.3)

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
                break
            except Exception as e:
                logger.error(f"Unexpected error for butir {butir.id}: {e}")
                butir.status = "tertunda"
                break

        butir.updated_at = datetime.now(timezone.utc)
        await db.commit()


def distribute_bloom_levels(jumlah_butir: int, distribusi_bloom: dict) -> list[str]:
    """
    Convert bloom distribution percentages to a list of target levels.
    E.g., 5 butir with {"C1": 20, "C2": 40, "C3": 40} => ["C1", "C2", "C2", "C3", "C3"]
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
    Called as a background task from the API endpoint.
    Uses GLOBAL_GENERATION_LOCK so multiple kisi-kisi requests queue smoothly.

    Phase 1: Create all butir records upfront as 'draft' so the UI can
             immediately display the table with all rows.
    Phase 2: Process each butir through the debate pipeline sequentially.
    """
    async with get_generation_lock():
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
            await proses_satu_butir(butir_id, level, chunk_content)
            if i < len(plan_data) - 1:
                await asyncio.sleep(1.0)

        logger.info(f"Generation complete for kisi-kisi {kisi_kisi_id}")


async def retry_butir_tertunda(kisi_kisi_id: uuid.UUID):
    """
    Retry all butir with status 'tertunda' for a given kisi-kisi.
    Resets them to 'draft' first, then processes through the debate pipeline.
    Does NOT use the generation lock — only retries existing records.
    """
    async with async_session() as db:
        result = await db.execute(
            select(ButirSoal)
            .where(
                ButirSoal.kisi_kisi_id == kisi_kisi_id,
                ButirSoal.status == "tertunda",
            )
            .order_by(ButirSoal.created_at)
        )
        tertunda_butir = result.scalars().all()

        if not tertunda_butir:
            logger.info(f"No tertunda butir found for kisi-kisi {kisi_kisi_id}")
            return

        retry_plan = []
        for butir in tertunda_butir:
            chunk_content = ""
            if butir.rujukan_chunk_id:
                chunk_result = await db.execute(
                    select(MateriChunk).where(MateriChunk.id == butir.rujukan_chunk_id)
                )
                chunk = chunk_result.scalar_one_or_none()
                if chunk:
                    chunk_content = chunk.content

            butir.status = "draft"
            butir.ronde_saat_ini = 0
            retry_plan.append((butir.id, butir.level_bloom, chunk_content))

        await db.commit()

    logger.info(
        f"Retrying {len(retry_plan)} tertunda butir for kisi-kisi {kisi_kisi_id}"
    )

    for i, (butir_id, level, chunk_content) in enumerate(retry_plan):
        await proses_satu_butir(butir_id, level, chunk_content)
        if i < len(retry_plan) - 1:
            await asyncio.sleep(1.0)

    logger.info(f"Retry complete for kisi-kisi {kisi_kisi_id}")

