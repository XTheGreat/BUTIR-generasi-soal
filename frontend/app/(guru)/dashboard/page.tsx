"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { ButirSoal } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import EmptyState from "@/components/ui/EmptyState";
import Table, { Column } from "@/components/ui/Table";
import RondeIndicator from "@/components/ui/RondeIndicator";

export default function DashboardPage() {
  const user = getCurrentUser();
  const [stats, setStats] = useState({
    materi: 0,
    bankSoal: 0,
    ditandai: 0,
  });
  const [markedList, setMarkedList] = useState<ButirSoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [materi, bank, ditandai] = await Promise.all([
          apiFetch("/api/materi").catch(() => []),
          apiFetch("/api/bank-soal").catch(() => []),
          apiFetch("/api/butir?status=ditandai").catch(() => []),
        ]);

        setStats({
          materi: Array.isArray(materi) ? materi.length : 0,
          bankSoal: Array.isArray(bank) ? bank.length : 0,
          ditandai: Array.isArray(ditandai) ? ditandai.length : 0,
        });

        if (Array.isArray(ditandai)) {
          setMarkedList(ditandai.slice(0, 5));
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const markedColumns: Column<ButirSoal>[] = [
    {
      key: "id",
      header: "#",
      className: "font-mono text-xs text-[var(--ink-muted)] w-12",
      render: (_, idx) => idx + 1,
    },
    {
      key: "pertanyaan",
      header: "Pertanyaan",
      className: "max-w-md",
      render: (item) => (
        <span className="font-serif text-sm text-[var(--ink)] line-clamp-1">
          {item.pertanyaan}
        </span>
      ),
    },
    {
      key: "level_bloom",
      header: "Bloom",
      className: "w-20",
      render: (item) => <BloomChip level={item.level_bloom} />,
    },
    {
      key: "status",
      header: "Status",
      className: "w-28",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "ronde_saat_ini",
      header: "Ronde",
      className: "w-36",
      render: (item) => <RondeIndicator ronde={item.ronde_saat_ini} />,
    },
    {
      key: "aksi",
      header: "",
      className: "w-28 text-right",
      render: (item) => (
        <Link
          href={`/butir-ditandai/${item.id}`}
          className="text-xs text-[var(--accent)] hover:underline font-medium"
        >
          Telaah Debat
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard Naskah"
        description={`Lembar kerja telaah dan validasi butir soal. Selamat bertugas, ${
          user?.nama || "Guru Penguji"
        }.`}
        action={
          <Link href="/kisi-kisi">
            <Button size="sm">Buat Kisi-kisi</Button>
          </Link>
        }
      />

      <div className="border border-[var(--line)] bg-[var(--surface)] rounded-none mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)]">
          <div className="p-6">
            <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
              Materi Ajar Tersimpan
            </div>
            <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
              {loading ? "—" : stats.materi}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              Dokumen kurikulum dasar pembentukan soal
            </p>
          </div>

          <div className="p-6">
            <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
              Bank Soal Tervalidasi
            </div>
            <div className="font-serif text-4xl font-normal text-[var(--ink)] tabular-nums">
              {loading ? "—" : stats.bankSoal}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              Butir berstatus diterima dari proses debat
            </p>
          </div>

          <div className="p-6">
            <div className="text-xs font-medium text-[var(--ink-muted)] font-sans mb-1.5">
              Butir Perlu Tindakan
            </div>
            <div
              className={`font-serif text-4xl font-normal tabular-nums ${
                stats.ditandai > 0 ? "text-[#8A5A00]" : "text-[var(--ink)]"
              }`}
            >
              {loading ? "—" : stats.ditandai}
            </div>
            <p className="text-xs text-[var(--ink-muted)] mt-1.5">
              Butir ditandai menunggu keputusan manual guru
            </p>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-2">
          <div>
            <h2 className="font-serif text-lg font-normal text-[var(--ink)] tracking-tight">
              Perlu Tindakan
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">
              Daftar butir soal yang tidak mencapai konsensus agen dan membutuhkan verifikasi
            </p>
          </div>
          {markedList.length > 0 && (
            <Link
              href="/butir-ditandai"
              className="text-xs text-[var(--accent)] hover:underline font-medium"
            >
              Lihat semua ({stats.ditandai})
            </Link>
          )}
        </div>

        {markedList.length === 0 ? (
          <EmptyState
            title="Tidak ada butir yang menunggu tindakan"
            description="Semua butir soal dari sesi debat terkini telah tervalidasi atau belum ada proses generasi yang aktif."
            action={
              <div className="flex gap-2 justify-center">
                <Link href="/kisi-kisi">
                  <Button size="sm">Mulai Sesi Baru</Button>
                </Link>
                <Link href="/bank-soal">
                  <Button size="sm" variant="secondary">
                    Periksa Bank Soal
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <Table columns={markedColumns} data={markedList} />
        )}
      </section>
    </div>
  );
}
