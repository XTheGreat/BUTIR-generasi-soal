"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ButirSoal } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import BloomChip from "@/components/ui/BloomChip";
import EmptyState from "@/components/ui/EmptyState";

export default function RakitUjianPage() {
  const router = useRouter();
  const [butirList, setButirList] = useState<ButirSoal[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [judul, setJudul] = useState("");
  const [durasi, setDurasi] = useState(60);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch("/api/bank-soal")
      .then((data) => setButirList(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedIds.length === butirList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(butirList.map((b) => b.id));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError("Pilih minimal satu butir soal dari bank soal.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const ujian = await apiFetch("/api/ujian", {
        method: "POST",
        body: JSON.stringify({
          judul,
          butir_ids: selectedIds,
          durasi_menit: durasi,
        }),
      });
      router.push(`/ujian/${ujian.id}`);
    } catch (err: any) {
      setError(err.message || "Gagal membuat paket ujian.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Rakit Paket Ujian"
        description="Pilih butir soal yang telah tervalidasi dan tetapkan konfigurasi durasi pelaksanaan ujian."
      />

      {butirList.length === 0 ? (
        <EmptyState
          title="Bank soal kosong"
          description="Anda memerlukan setidaknya satu butir soal yang telah disetujui untuk merakit paket ujian."
          action={
            <Link href="/kisi-kisi">
              <Button size="sm">Buat Kisi-kisi & Butir Soal</Button>
            </Link>
          }
        />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          <div className="border border-[var(--line)] bg-[var(--surface)] p-5 space-y-4">
            <h2 className="font-serif text-lg font-normal text-[var(--ink)]">
              Konfigurasi Naskah Ujian
            </h2>

            <Input
              label="Judul Paket Ujian"
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Penilaian Akhir Semester - Fisika Terapan"
              helper="Judul akan tampil pada lembar pengerjaan siswa"
              required
            />

            <div className="w-36">
              <Input
                label="Durasi (Menit)"
                type="number"
                min={5}
                max={240}
                value={durasi}
                onChange={(e) => setDurasi(parseInt(e.target.value) || 60)}
                helper="5 - 240 menit"
                className="font-mono tabular-nums"
                required
              />
            </div>
          </div>

          <div className="border border-[var(--line)] bg-[var(--canvas)] p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line)]">
              <div>
                <span className="text-sm font-medium text-[var(--ink)] block">
                  Pilih Butir Soal
                </span>
                <span className="text-xs text-[var(--ink-muted)] font-mono tabular-nums">
                  Terpilih: {selectedIds.length} dari {butirList.length} butir
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={selectAll}
              >
                {selectedIds.length === butirList.length
                  ? "Batal Pilih Semua"
                  : "Pilih Semua"}
              </Button>
            </div>

            <div className="divide-y divide-[var(--line)] max-h-96 overflow-y-auto">
              {butirList.map((butir, i) => (
                <label
                  key={butir.id}
                  className="flex items-start gap-3 py-2.5 px-2 hover:bg-[var(--surface)] cursor-pointer select-none transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(butir.id)}
                    onChange={() => toggle(butir.id)}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-[var(--ink-muted)]">
                        #{i + 1}
                      </span>
                      <BloomChip level={butir.level_bloom} />
                    </div>
                    <p className="font-serif text-sm text-[var(--ink)] line-clamp-2 leading-relaxed">
                      {butir.pertanyaan}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded bg-[#FBEAEA] border border-[#A4262C]/30 text-xs text-[#A4262C]">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={loading || selectedIds.length === 0}
              size="lg"
            >
              {loading ? "Menyusun Paket..." : "Terbitkan Draft Paket Ujian"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
