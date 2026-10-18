"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { PaketUjian } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";

export default function UjianDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const ujianId = resolvedParams.id;

  const [ujian, setUjian] = useState<PaketUjian | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadUjian() {
    try {
      const data = await apiFetch(`/api/ujian/${ujianId}`);
      setUjian(data);
    } catch {}
  }

  useEffect(() => {
    loadUjian();
  }, [ujianId]);

  async function handleTerbitkan() {
    setError("");
    setLoading(true);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await apiFetch(`/api/ujian/${ujianId}/terbitkan`, {
        method: "POST",
        body: JSON.stringify({
          waktu_mulai: now.toISOString(),
          waktu_selesai: end.toISOString(),
        }),
      });
      await loadUjian();
    } catch (err: any) {
      setError(err.message || "Gagal menerbitkan ujian.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (ujian?.kode_akses) {
      navigator.clipboard.writeText(ujian.kode_akses);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!ujian) {
    return (
      <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
        Memuat rincian paket ujian...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={ujian.judul}
        description="Spesifikasi paket ujian, kode otorisasi akses siswa, dan status penerbitan."
        action={
          <Link href={`/laporan/${ujianId}`}>
            <Button variant="secondary" size="sm">
              Laporan Analisis
            </Button>
          </Link>
        }
      />

      {ujian.kode_akses && (
        <div className="border border-[var(--line-strong)] bg-[var(--surface)] p-6 mb-8 text-center rounded-none">
          <span className="text-xs font-sans text-[var(--ink-muted)] block">
            Kode Akses Siswa
          </span>
          <div className="font-mono text-5xl font-bold tracking-[0.3em] text-[var(--ink)] my-3 select-all pl-[0.3em]">
            {ujian.kode_akses}
          </div>
          <p className="text-xs text-[var(--ink-muted)] mb-4 max-w-sm mx-auto">
            Siswa dapat memasukkan kode ini pada laman ujian untuk mengakses naskah soal.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="font-mono text-xs"
          >
            {copied ? "✓ Tersalin ke Clipboard" : "Salin Kode Akses"}
          </Button>
        </div>
      )}

      <div className="border border-[var(--line)] bg-[var(--canvas)] p-6 mb-6">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] border-b border-[var(--line)] pb-2 mb-4">
          Spesifikasi Naskah
        </h2>

        <div className="divide-y divide-[var(--line)] text-sm">
          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              Status Ujian
            </span>
            <StatusBadge status={ujian.status} />
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              Jumlah Butir Soal
            </span>
            <span className="font-mono font-medium text-[var(--ink)] tabular-nums">
              {ujian.butir_list?.length ?? 0} butir
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-xs text-[var(--ink-muted)] font-sans">
              Alokasi Waktu
            </span>
            <span className="font-mono font-medium text-[var(--ink)] tabular-nums">
              {ujian.durasi_menit} menit
            </span>
          </div>

          {ujian.waktu_mulai && (
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-xs text-[var(--ink-muted)] font-sans">
                Waktu Terbit
              </span>
              <span className="font-mono text-xs text-[var(--ink)] tabular-nums">
                {new Date(ujian.waktu_mulai).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}

          {ujian.waktu_selesai && (
            <div className="py-2.5 flex justify-between items-center">
              <span className="text-xs text-[var(--ink-muted)] font-sans">
                Batas Pengumpulan
              </span>
              <span className="font-mono text-xs text-[var(--ink)] tabular-nums">
                {new Date(ujian.waktu_selesai).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 mb-6 rounded bg-[#FBEAEA] border border-[#A4262C]/30 text-xs text-[#A4262C]">
          {error}
        </div>
      )}

        <div className="flex items-center gap-3">
          {ujian.status === "draft" && (
            <Button onClick={handleTerbitkan} disabled={loading} size="lg">
              {loading ? "Menerbitkan..." : "Terbitkan Ujian & Generate Kode Akses"}
            </Button>
          )}
        </div>
    </div>
  );
}
