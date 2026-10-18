"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { ButirSoal } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import EmptyState from "@/components/ui/EmptyState";
import { Key } from "lucide-react";

export default function BankSoalPage() {
  const [butirList, setButirList] = useState<ButirSoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadBank() {
    try {
      const data = await apiFetch("/api/bank-soal");
      setButirList(Array.isArray(data) ? data : []);
    } catch {
      setButirList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBank();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Hapus butir soal ini dari Bank Soal?")) return;
    try {
      await apiFetch(`/api/bank-soal/${id}`, { method: "DELETE" });
      await loadBank();
    } catch {}
  }

  async function handleExport() {
    try {
      const ids = butirList.map((b) => b.id).join(",");
      window.open(
        `${
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        }/api/bank-soal/export?format=json&ids=${ids}`,
        "_blank"
      );
    } catch {}
  }

  return (
    <div>
      <PageHeader
        title="Bank Soal Tervalidasi"
        description="Repositori butir soal yang telah lulus proses deliberasi dan siap dirakit ke dalam paket ujian."
        action={
          butirList.length > 0 ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
              >
                Ekspor JSON
              </Button>
              <Link href="/rakit-ujian">
                <Button size="sm">Rakit Ujian</Button>
              </Link>
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          Memuat bank soal...
        </div>
      ) : butirList.length === 0 ? (
        <EmptyState
          title="Bank soal masih kosong"
          description="Belum ada butir soal yang disetujui. Susun kisi-kisi dan jalankan debat multi-agen untuk mengisi bank soal."
          action={
            <Link href="/kisi-kisi">
              <Button size="sm">Buat Kisi-kisi Baru</Button>
            </Link>
          }
        />
      ) : (
        <div className="border border-[var(--line)] bg-[var(--canvas)] overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-[var(--surface)] z-10 border-b border-[var(--line)]">
              <tr>
                <th className="w-12 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] font-mono">
                  #
                </th>
                <th className="px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  Pertanyaan
                </th>
                <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  Bloom
                </th>
                <th className="w-20 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right font-mono">
                  Bobot
                </th>
                <th className="w-40 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  Prediksi Kesukaran
                </th>
                <th className="w-28 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)]">
                  Status
                </th>
                <th className="w-32 px-3 py-2.5 text-xs font-medium text-[var(--ink-muted)] text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {butirList.map((butir, idx) => {
                const kesukaranPct =
                  butir.prediksi_kesukaran !== null &&
                  butir.prediksi_kesukaran !== undefined
                    ? Math.round(butir.prediksi_kesukaran * 100)
                    : null;
                const isExpanded = expandedId === butir.id;

                return (
                  <React.Fragment key={butir.id}>
                    <tr
                      className={`transition-colors duration-140 ${
                        isExpanded ? "bg-[var(--surface)]/90" : "hover:bg-[var(--surface)]/60"
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-[var(--ink-muted)] tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5 max-w-md">
                        <p className="font-serif text-sm text-[var(--ink)] line-clamp-2 leading-relaxed">
                          {butir.pertanyaan}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <BloomChip level={butir.level_bloom} />
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-[var(--ink)]">
                        {butir.bobot_poin ?? 1}
                      </td>
                      <td className="px-3 py-2.5">
                        {kesukaranPct !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs tabular-nums text-[var(--ink)] w-9 text-right">
                              {kesukaranPct}%
                            </span>
                            <div className="h-1.5 w-16 bg-[var(--line)] rounded-none overflow-hidden">
                              <div
                                className="bg-[var(--accent)] h-full"
                                style={{ width: `${kesukaranPct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--ink-muted)] font-mono">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={butir.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : butir.id)
                            }
                            className="text-xs text-[var(--accent)] hover:underline font-medium focus-visible:outline-none"
                          >
                            {isExpanded ? "Tutup" : "Lihat Soal"}
                          </button>
                          <button
                            onClick={() => handleDelete(butir.id)}
                            className="text-xs text-[var(--ink-muted)] hover:text-[#A4262C] transition-colors underline focus-visible:outline-none"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-[var(--surface)]">
                        <td colSpan={7} className="p-6 border-b border-[var(--line)]">
                          <div className="max-w-3xl space-y-4">
                            <div>
                              <span className="font-sans text-xs font-semibold text-[var(--ink-muted)] block mb-1">
                                Pertanyaan Naskah:
                              </span>
                              <p className="font-serif text-base text-[var(--ink)] leading-relaxed">
                                {butir.pertanyaan}
                              </p>
                            </div>

                            {butir.pilihan && (
                              <div className="space-y-1.5 pt-2">
                                <span className="font-sans text-xs font-semibold text-[var(--ink-muted)] block mb-1">
                                  Opsi Jawaban:
                                </span>
                                {Object.entries(butir.pilihan).map(([key, val]) => {
                                  const isKey = key === butir.kunci_jawaban;
                                  return (
                                    <div
                                      key={key}
                                      className={`flex items-start gap-3 p-2.5 rounded text-sm transition-colors ${
                                        isKey
                                          ? "bg-[#E8F3EB] border border-[#1F6B3A]/30 text-[var(--ink)] font-medium"
                                          : "bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)]"
                                      }`}
                                    >
                                      <span className="font-mono text-xs font-semibold w-5 shrink-0 pt-0.5">
                                        {key}.
                                      </span>
                                      <span className="font-serif flex-1 leading-normal">
                                        {val}
                                      </span>
                                      {isKey && (
                                        <span className="inline-flex items-center gap-1.5 font-sans text-xs text-[#1F6B3A] font-medium shrink-0 pt-0.5">
                                          <Key size={13} strokeWidth={2} />
                                          <span>Kunci</span>
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {butir.pembahasan && (
                              <div className="bg-[var(--canvas)] border border-[var(--line)] p-4 text-xs mt-3">
                                <div className="font-sans text-xs font-medium text-[var(--ink-muted)] mb-1">
                                  Pembahasan Naskah:
                                </div>
                                <p className="font-serif text-[var(--ink)] leading-relaxed text-sm">
                                  {butir.pembahasan}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
