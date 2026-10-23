"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ButirTertunda, RiwayatPercobaan } from "@/lib/types";
import { formatWaktu } from "@/lib/format";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Table, { Column } from "@/components/ui/Table";
import StatusBadge from "@/components/ui/StatusBadge";
import BloomChip from "@/components/ui/BloomChip";
import RondeIndicator from "@/components/ui/RondeIndicator";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const sedangDiproses = (status: string) =>
  status === "draft" || status === "debating";

function HasilPercobaan({ hasil }: { hasil: string }) {
  if (hasil === "dihentikan" || hasil === "berjalan") {
    return (
      <span className="text-xs font-semibold text-[var(--ink-muted)]">
        {hasil === "dihentikan" ? "Dihentikan" : "Berjalan"}
      </span>
    );
  }
  return <StatusBadge status={hasil} />;
}

export default function ButirTertundaPage() {
  const [tab, setTab] = useState<"tertunda" | "riwayat">("tertunda");
  const [items, setItems] = useState<ButirTertunda[]>([]);
  const [diulang, setDiulang] = useState<ButirTertunda[]>([]);
  const [diulangLoading, setDiulangLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [riwayatId, setRiwayatId] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<RiwayatPercobaan[]>([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch("/api/butir/tertunda");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      // pertahankan daftar terakhir; polling berikutnya mencoba lagi
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiulang = useCallback(async () => {
    setDiulangLoading(true);
    try {
      const data = await apiFetch("/api/butir/diulang");
      setDiulang(Array.isArray(data) ? data : []);
    } catch {
      setDiulang([]);
    } finally {
      setDiulangLoading(false);
    }
  }, []);

  const loadRiwayat = useCallback(async (id: string) => {
    setRiwayatLoading(true);
    try {
      const data = await apiFetch(`/api/butir/${id}/riwayat`);
      setRiwayat(Array.isArray(data) ? data : []);
    } catch {
      setRiwayat([]);
    } finally {
      setRiwayatLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (tab === "riwayat") loadDiulang();
  }, [tab, loadDiulang]);

  // Selalu menyegarkan diri: butir bisa baru menjadi tertunda (gagal karena rate limit)
  // setelah halaman ini dibuka. Lebih cepat selama ada butir yang sedang diproses.
  const adaYangDiproses = items.some((b) => sedangDiproses(b.status));

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
      if (riwayatId) loadRiwayat(riwayatId);
    }, adaYangDiproses ? 3000 : 6000);
    return () => clearInterval(interval);
  }, [adaYangDiproses, loadData, loadRiwayat, riwayatId]);

  async function aksiButir(id: string, aksi: "retry" | "stop") {
    setBusyId(id);
    setError("");
    try {
      await apiFetch(`/api/butir/${id}/${aksi}`, { method: "POST" });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Aksi gagal dijalankan.");
    } finally {
      setBusyId(null);
    }
  }

  async function ulangiSemua() {
    setBulkBusy(true);
    setError("");
    try {
      await apiFetch("/api/butir/retry-semua", { method: "POST" });
      setConfirmBulk(false);
      await loadData();
    } catch (err: any) {
      setConfirmBulk(false);
      setError(err.message || "Gagal mengulang butir tertunda.");
    } finally {
      setBulkBusy(false);
    }
  }

  function bukaRiwayat(id: string) {
    if (riwayatId === id) {
      setRiwayatId(null);
      return;
    }
    setRiwayatId(id);
    setRiwayat([]);
    loadRiwayat(id);
  }

  const jumlahTertunda = items.filter((b) => b.status === "tertunda").length;

  const columns: Column<ButirTertunda>[] = [
    {
      key: "no",
      header: "#",
      className: "font-mono text-xs text-[var(--ink-muted)] tabular-nums",
      render: (_b, i) => i + 1,
    },
    {
      key: "kisi_kisi_label",
      header: "Kisi-kisi",
      className: "max-w-[220px]",
      render: (b) => (
        <span className="font-serif line-clamp-2" title={b.kisi_kisi_label}>
          {b.kisi_kisi_label}
        </span>
      ),
    },
    {
      key: "level_bloom",
      header: "Bloom",
      render: (b) => <BloomChip level={b.level_bloom} />,
    },
    {
      key: "status",
      header: "Status",
      render: (b) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={b.status} />
          {sedangDiproses(b.status) && (
            <RondeIndicator ronde={b.ronde_saat_ini} />
          )}
        </div>
      ),
    },
    {
      key: "percobaan_ke",
      header: "Percobaan",
      className: "font-mono text-xs tabular-nums",
      render: (b) => `ke-${b.percobaan_ke}`,
    },
    {
      key: "alasan_tertunda",
      header: "Penyebab",
      className: "max-w-[280px]",
      render: (b) =>
        b.status === "tertunda" ? (
          <span
            className="font-mono text-xs text-[var(--ink-muted)] line-clamp-2"
            title={b.alasan_tertunda || undefined}
          >
            {b.alasan_tertunda || "Tidak tercatat"}
          </span>
        ) : (
          <span className="text-xs text-[var(--ink-muted)]">
            {b.status === "draft" ? "Menunggu giliran" : "Sedang berdebat"}
          </span>
        ),
    },
    {
      key: "updated_at",
      header: "Diperbarui",
      className: "text-xs text-[var(--ink-muted)] tabular-nums whitespace-nowrap",
      render: (b) => formatWaktu(b.updated_at),
    },
    {
      key: "aksi",
      header: "Aksi",
      className: "whitespace-nowrap",
      render: (b) => (
        <div className="flex items-center gap-1.5">
          {b.status === "tertunda" ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busyId === b.id || bulkBusy}
              onClick={() => aksiButir(b.id, "retry")}
            >
              Ulangi
            </Button>
          ) : (
            <Button
              size="sm"
              variant="danger"
              disabled={busyId === b.id}
              onClick={() => aksiButir(b.id, "stop")}
            >
              Hentikan
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => bukaRiwayat(b.id)}>
            {riwayatId === b.id ? "Tutup Riwayat" : "Riwayat"}
          </Button>
        </div>
      ),
    },
  ];

  const diulangColumns: Column<ButirTertunda>[] = [
    ...columns.filter((c) =>
      ["no", "kisi_kisi_label", "level_bloom", "percobaan_ke", "updated_at"].includes(c.key)
    ),
    {
      key: "status",
      header: "Status Akhir",
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (b) => (
        <Button size="sm" variant="ghost" onClick={() => bukaRiwayat(b.id)}>
          {riwayatId === b.id ? "Tutup Riwayat" : "Riwayat"}
        </Button>
      ),
    },
  ];

  const riwayatColumns: Column<RiwayatPercobaan>[] = [
    {
      key: "percobaan_ke",
      header: "Percobaan",
      className: "font-mono text-xs tabular-nums",
      render: (r) => `ke-${r.percobaan_ke}`,
    },
    {
      key: "hasil",
      header: "Hasil",
      render: (r) => <HasilPercobaan hasil={r.hasil} />,
    },
    {
      key: "ronde_terakhir",
      header: "Ronde terakhir",
      className: "font-mono text-xs tabular-nums",
      render: (r) => r.ronde_terakhir || "-",
    },
    {
      key: "mulai",
      header: "Mulai",
      className: "text-xs tabular-nums whitespace-nowrap",
      render: (r) => formatWaktu(r.mulai),
    },
    {
      key: "selesai",
      header: "Selesai",
      className: "text-xs tabular-nums whitespace-nowrap",
      render: (r) => formatWaktu(r.selesai),
    },
    {
      key: "alasan",
      header: "Keterangan",
      className: "max-w-[320px]",
      render: (r) => (
        <span className="font-mono text-xs text-[var(--ink-muted)]">
          {r.alasan || "-"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Butir Tertunda"
        description="Butir yang gagal diproses karena kendala panggilan agen atau dihentikan. Ulangi satu per satu atau sekaligus; pembuatan soal baru tetap didahulukan dalam antrean."
        action={
          <Button
            variant="primary"
            disabled={jumlahTertunda === 0 || bulkBusy}
            onClick={() => setConfirmBulk(true)}
          >
            Ulangi Semua Butir Tertunda
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="mb-4 border border-[#A4262C]/40 bg-[#FBEAEA] px-3 py-2 text-sm text-[#A4262C]"
        >
          {error}
        </div>
      )}

      <div role="tablist" className="flex gap-6 border-b border-[var(--line)] mb-4">
        {(
          [
            ["tertunda", "Perlu Diulang"],
            ["riwayat", "Riwayat Pengulangan"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setRiwayatId(null);
            }}
            className={`pb-2 -mb-px text-[15px] font-serif border-b-2 transition-colors ${
              tab === key
                ? "border-[var(--accent)] text-[var(--ink)] font-medium"
                : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "tertunda" ? (
        loading ? (
          <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
            Memuat daftar butir tertunda...
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Tidak ada butir tertunda"
            description="Seluruh butir yang dibuat telah selesai ditelaah oleh agen."
          />
        ) : (
          <Table data={items} columns={columns} />
        )
      ) : diulangLoading && diulang.length === 0 ? (
        <div className="border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-xs text-[var(--ink-muted)] font-mono">
          Memuat riwayat pengulangan...
        </div>
      ) : (
        <Table
          data={diulang}
          columns={diulangColumns}
          emptyMessage="Belum ada butir yang pernah diulang."
        />
      )}

      {riwayatId && (
        <section className="mt-8">
          <h2 className="font-serif text-xl font-normal text-[var(--ink)] mb-3">
            Riwayat Percobaan
            <span className="ml-2 font-mono text-xs text-[var(--ink-muted)]">
              {riwayatId.slice(0, 8)}
            </span>
          </h2>
          {riwayatLoading && riwayat.length === 0 ? (
            <div className="border border-[var(--line)] bg-[var(--surface)] p-6 text-center text-xs text-[var(--ink-muted)] font-mono">
              Memuat riwayat...
            </div>
          ) : (
            <Table
              data={riwayat}
              columns={riwayatColumns}
              emptyMessage="Belum ada percobaan tercatat untuk butir ini."
            />
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirmBulk}
        title="Ulangi semua butir tertunda?"
        description={`${jumlahTertunda} butir akan masuk antrean dan diproses satu per satu. Setiap butir memakai kuota API agen.`}
        confirmLabel="Ulangi Semua"
        loading={bulkBusy}
        onConfirm={ulangiSemua}
        onCancel={() => setConfirmBulk(false)}
      />
    </div>
  );
}
