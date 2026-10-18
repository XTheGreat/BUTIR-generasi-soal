"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { GenerationStatus } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import RondeIndicator from "@/components/ui/RondeIndicator";

function renderRondePip(ronde: number, maxRonde = 3) {
  return <RondeIndicator ronde={ronde} maxRonde={maxRonde} />;
}

export default function GenerasiPage() {
  const params = useParams();
  const kisiKisiId = params.kisiKisiId as string;
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/kisi-kisi/${kisiKisiId}/status`);
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, [kisiKisiId]);

  async function startGeneration() {
    setError("");
    try {
      await apiFetch(`/api/kisi-kisi/${kisiKisiId}/generate`, {
        method: "POST",
      });
      setStarted(true);
      setPolling(true);
    } catch (err: any) {
      setError(err.message || "Gagal memulai generasi.");
    }
  }

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(async () => {
      const data = await loadStatus();
      if (data && data.total > 0) {
        if (data.selesai === data.total) {
          setPolling(false);
          try {
            localStorage.removeItem("butir_active_generation");
            window.dispatchEvent(new Event("generation_status_changed"));
          } catch {}
        } else {
          try {
            localStorage.setItem("butir_active_generation", JSON.stringify({ id: kisiKisiId }));
            window.dispatchEvent(new Event("generation_status_changed"));
          } catch {}
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [polling, loadStatus, kisiKisiId]);

  useEffect(() => {
    let attempts = 0;
    const checkInitial = async () => {
      const data = await loadStatus();
      if (data && data.total > 0) {
        setStarted(true);
        if (data.selesai < data.total) {
          setPolling(true);
          try {
            localStorage.setItem("butir_active_generation", JSON.stringify({ id: kisiKisiId }));
            window.dispatchEvent(new Event("generation_status_changed"));
          } catch {}
        } else {
          try {
            localStorage.removeItem("butir_active_generation");
            window.dispatchEvent(new Event("generation_status_changed"));
          } catch {}
        }
      } else if (attempts < 5) {
        attempts++;
        setTimeout(checkInitial, 1000);
      }
    };
    checkInitial();
  }, [loadStatus, kisiKisiId]);

  const isComplete =
    status && status.total > 0 && status.selesai === status.total;

  const progressPercent =
    status && status.total > 0
      ? Math.round((status.selesai / status.total) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title="Progres Debat Multi-Agen"
        description="Simulasi deliberasi empat agen AI (Penyusun, Kritikus, Penjawab Buta, Arbiter) untuk menguji validitas tiap butir."
        action={
          isComplete ? (
            <div className="flex gap-2">
              <Link href="/butir-ditandai">
                <Button variant="secondary" size="sm">
                  Butir Ditandai
                </Button>
              </Link>
              <Link href="/bank-soal">
                <Button size="sm">Buka Bank Soal</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {!started && (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-6 max-w-xl rounded-lg">
          <h2 className="font-serif text-lg font-normal text-[var(--ink)] mb-2">
            Mulai Deliberasi Agen
          </h2>
          <p className="text-xs text-[var(--ink-muted)] mb-5 leading-relaxed">
            Sistem akan menjalankan siklus debat hingga maksimal 3 ronde per butir soal. Setiap butir diuji kesesuaian taksonomi, kejelasan stimulus, dan ketepatan kunci jawaban sebelum disetujui.
          </p>
          <Button onClick={startGeneration} size="md">
            Mulai Eksekusi Debat
          </Button>
          {error && (
            <div className="mt-4 p-2.5 rounded bg-[#FBEAEA] border border-[#A4262C]/30 text-xs text-[#A4262C]">
              {error}
            </div>
          )}
        </div>
      )}

      {started && (!status || status.total === 0) && (
        <div className="border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-6 max-w-xl rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
              Mempersiapkan Butir Soal...
            </h2>
          </div>
          <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-4">
            Sistem sedang mempersiapkan butir soal untuk didebatkan. Jika ada generasi lain yang masih berjalan, proses ini akan menunggu giliran.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--ink-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Menunggu antrean...
          </div>
        </div>
      )}

      {status && status.total > 0 && (
        <div className="space-y-6">
          
          <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="font-serif text-sm font-normal text-[var(--ink)]">
                {status.selesai} dari {status.total} butir selesai{" "}
                <span className="font-sans text-xs text-[var(--ink-muted)]">({progressPercent}%)</span>
              </div>
              {polling ? (
                <div className="text-[var(--accent)] font-sans text-xs font-medium">
                  Sinkronisasi live...
                </div>
              ) : (
                <div className="font-sans text-[#1F6B3A] text-xs font-medium">
                  ✓ Selesai
                </div>
              )}
            </div>

            <div className="w-full bg-[var(--line)] h-1 overflow-hidden rounded-full">
              <div
                className="bg-[var(--accent)] h-1 transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {polling && (
              <p className="mt-3 text-[11px] text-[var(--ink-muted)] leading-relaxed">
                Proses deliberasi 4 agen AI dijalankan di latar belakang server. Anda dapat berpindah halaman atau meninggalkan laman ini dengan aman tanpa khawatir progres hilang. Tombol kembali ke debat akan muncul di bilah atas jika Anda berpindah ke halaman lain.
              </p>
            )}
          </div>

          <div className="w-full overflow-x-auto border border-[var(--line)] bg-[var(--canvas)] rounded-lg">
            <table className="w-full border-collapse text-left text-sm table-fixed">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--line)]">
                  <th className="w-14 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                    #
                  </th>
                  <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    Bloom
                  </th>
                  <th className="w-32 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    Status
                  </th>
                  <th className="w-48 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                    Ronde
                  </th>
                  <th className="px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                    Keterangan Naskah
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {status.items.map((item, i) => (
                  <tr
                    key={item.id || i}
                    className="h-12 hover:bg-[var(--surface)]/60 transition-colors duration-140"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                      {i + 1}
                    </td>
                    <td className="px-3 py-2">
                      <BloomChip level={item.level_bloom} />
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2">
                      {renderRondePip(item.ronde_saat_ini)}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--ink)] truncate font-serif">
                      {item.pertanyaan ? (
                        item.pertanyaan
                      ) : (
                        <span className="text-[var(--ink-muted)] font-sans italic">
                          Menunggu giliran telaah agen...
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
