"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Materi } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import BloomPieChart from "@/components/ui/BloomPieChart";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { FolderOpen } from "lucide-react";

const BLOOM_LEVELS = ["C1", "C2", "C3", "C4", "C5", "C6"];
const BLOOM_LABELS: Record<string, string> = {
  C1: "Mengingat",
  C2: "Memahami",
  C3: "Menerapkan",
  C4: "Menganalisis",
  C5: "Mengevaluasi",
  C6: "Mencipta",
};

export default function KisiKisiPage() {
  const router = useRouter();
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [selectedMateri, setSelectedMateri] = useState<string[]>([]);
  const [jumlahButir, setJumlahButir] = useState(5);
  const [bloom, setBloom] = useState<Record<string, number>>({
    C1: 0,
    C2: 20,
    C3: 30,
    C4: 30,
    C5: 20,
    C6: 0,
  });
  const [cakupanBab, setCakupanBab] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    apiFetch("/api/materi")
      .then((data) => setMateriList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const bloomTotal = Object.values(bloom).reduce((a, b) => a + b, 0);

  function handleBloomChange(level: string, value: string) {
    const num = Math.max(0, Math.min(100, parseInt(value) || 0));
    setBloom((prev) => ({ ...prev, [level]: num }));
  }

  function toggleMateri(id: string) {
    setSelectedMateri((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  function handlePreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (bloomTotal !== 100) {
      setError(`Total persentase distribusi Bloom harus tepat 100% (saat ini ${bloomTotal}%).`);
      return;
    }
    if (selectedMateri.length === 0) {
      setError("Pilih minimal satu materi ajar sebagai rujukan.");
      return;
    }
    setError("");
    setShowConfirm(true);
  }

  async function handleConfirmGenerate() {
    setShowConfirm(false);
    setLoading(true);

    const distribusi: Record<string, number> = {};
    for (const [k, v] of Object.entries(bloom)) {
      if (v > 0) distribusi[k] = v;
    }

    try {
      const kk = await apiFetch("/api/kisi-kisi", {
        method: "POST",
        body: JSON.stringify({
          jumlah_butir: jumlahButir,
          distribusi_bloom: distribusi,
          cakupan_bab: cakupanBab || null,
          materi_ids: selectedMateri,
        }),
      });
      try {
        await apiFetch(`/api/kisi-kisi/${kk.id}/generate`, { method: "POST" });
      } catch {
      }
      router.push(`/generasi/${kk.id}`);
    } catch (err: any) {
      setError(err.message || "Gagal menyusun kisi-kisi.");
    } finally {
      setLoading(false);
    }
  }

  const selectedMateriNames = materiList
    .filter((m) => selectedMateri.includes(m.id))
    .map((m) => m.judul);

  const activeBloomLevels = Object.entries(bloom)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} (${v}%)`)
    .join(", ");

  return (
    <div>
      <PageHeader
        title="Rancang Kisi-kisi"
        description="Spesifikasi teknis proporsi kognitif Taksonomi Bloom dan materi rujukan butir ujian."
      />

      <form onSubmit={handlePreSubmit} className="flex flex-col gap-6 w-full">
        
        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <label className="text-sm font-medium text-[var(--ink)] block mb-1">
            Materi Pembelajaran Rujukan
          </label>
          <p className="text-xs text-[var(--ink-muted)] mb-3">
            Pilih satu atau lebih dokumen materi yang akan dijadikan basis ekstraksi butir.
          </p>

          {materiList.length === 0 ? (
            <div className="border border-dashed border-[var(--line-strong)]/40 bg-[var(--surface)]/40 p-6 text-center text-xs text-[var(--ink-muted)] rounded-lg flex flex-col items-center justify-center gap-2 select-none">
              <FolderOpen
                size={40}
                strokeWidth={1.25}
                className="text-[var(--ink-muted)]/65 fill-[var(--ink-muted)]/10"
              />
              <p>
                Belum ada materi ajar terdaftar.{" "}
                <Link href="/materi" className="text-[var(--accent)] underline font-medium hover:underline">
                  Unggah dokumen materi terlebih dahulu
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="border border-[var(--line)] bg-[var(--canvas)] divide-y divide-[var(--line)] max-h-48 overflow-y-auto rounded-lg">
              {materiList.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-[var(--surface)] cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedMateri.includes(m.id)}
                    onChange={() => toggleMateri(m.id)}
                    className="accent-[var(--accent)] rounded"
                  />
                  <span className="text-[var(--ink)]">{m.judul}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <Input
            label="Jumlah Target Butir Soal"
            type="number"
            min={1}
            max={50}
            value={jumlahButir}
            onChange={(e) => setJumlahButir(parseInt(e.target.value) || 1)}
            helper="Direkomendasikan 5–15 butir per siklus telaah deliberatif"
            className="w-28 font-sans font-medium tabular-nums"
            required
          />
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <label className="text-sm font-medium text-[var(--ink)] block">
                Distribusi Tingkat Kognitif Bloom (%)
              </label>
              <p className="text-xs text-[var(--ink-muted)]">
                Proporsi bobot butir soal dari tingkat dasar hingga tingkat tinggi (HOTS)
              </p>
            </div>
            <div
              className={`font-sans text-xs font-medium tabular-nums transition-colors ${
                bloomTotal === 100 ? "text-[#1F6B3A]" : "text-[#A4262C]"
              }`}
            >
              Total: <span className="font-semibold">{bloomTotal}%</span>
            </div>
          </div>

          <BloomPieChart bloom={bloom} total={bloomTotal} />

          {bloomTotal !== 100 && (
            <p className="text-xs text-[#A4262C] mb-3">
              Total distribusi saat ini {bloomTotal}%. Harus persis 100% untuk melanjutkan.
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
            {BLOOM_LEVELS.map((level) => (
              <div
                key={level}
                className="bg-[var(--canvas)] border border-[var(--line)] p-2.5 flex flex-col justify-between rounded-lg transition-shadow"
              >
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span className="font-mono text-[11px] font-semibold text-[var(--ink)] px-1.5 py-0.5 bg-[var(--surface)] border border-[var(--line)] rounded">
                    {level}
                  </span>
                  <span className="text-[11px] font-sans text-[var(--ink-muted)] truncate" title={BLOOM_LABELS[level]}>
                    {BLOOM_LABELS[level]}
                  </span>
                </div>
                <div className="flex items-baseline justify-end gap-1 px-2 py-1 bg-[var(--surface)] border border-[var(--line)] rounded focus-within:border-[var(--accent)] focus-within:bg-[var(--canvas)] focus-within:ring-1 focus-within:ring-[var(--accent)] transition-all">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={bloom[level]}
                    onChange={(e) => handleBloomChange(level, e.target.value)}
                    className="w-full bg-transparent font-sans text-base font-semibold text-[var(--ink)] tabular-nums text-right focus:outline-none"
                  />
                  <span className="font-sans text-xs font-medium text-[var(--ink-muted)] select-none">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[var(--line)] bg-[var(--surface)] p-5 rounded-lg">
          <Textarea
            label="Cakupan Bab & Fokus Indikator (Opsional)"
            value={cakupanBab}
            onChange={(e) => setCakupanBab(e.target.value)}
            placeholder="Misal: Fokuskan pada Hukum Newton II dan penerapannya pada bidang miring..."
            helper="Instruksi tambahan bagi Agen Penyusun untuk mempersempit ruang lingkup soal"
            rows={3}
            autoResize
            maxHeight={220}
          />
        </div>

        {error && (
          <div className="p-3 rounded bg-[#FBEAEA] border border-[#A4262C]/30 text-xs text-[#A4262C]">
            {error}
          </div>
        )}

        <div>
          <Button
            type="submit"
            disabled={loading || bloomTotal !== 100 || selectedMateri.length === 0}
            size="lg"
          >
            {loading ? "Menyusun Spesifikasi..." : "Buat Kisi-kisi & Mulai Debat Agen"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={showConfirm}
        title="Mulai Debat Multi-Agen"
        description="Proses ini akan memanggil agen AI secara berurutan untuk menyusun, mengkritik, dan memvalidasi butir soal. Pastikan spesifikasi sudah benar."
        confirmLabel="Mulai Generasi"
        onConfirm={handleConfirmGenerate}
        onCancel={() => setShowConfirm(false)}
      >
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--ink-muted)] text-xs">Jumlah butir target</span>
            <span className="font-mono tabular-nums font-medium text-[var(--ink)]">{jumlahButir}</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--ink-muted)] text-xs">Materi rujukan</span>
            <span className="text-xs text-[var(--ink)] text-right max-w-[200px] truncate">
              {selectedMateriNames.join(", ")}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-[var(--ink-muted)] text-xs">Distribusi Bloom</span>
            <span className="font-mono text-[11px] text-[var(--ink)]">
              {activeBloomLevels}
            </span>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
