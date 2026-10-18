"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Materi } from "@/lib/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Table, { Column } from "@/components/ui/Table";

export default function MateriPage() {
  const [materiList, setMateriList] = useState<Materi[]>([]);
  const [judul, setJudul] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadMateri() {
    try {
      const data = await apiFetch("/api/materi");
      setMateriList(Array.isArray(data) ? data : []);
    } catch {}
  }

  useEffect(() => {
    loadMateri();
  }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Silakan pilih file materi terlebih dahulu.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("judul", judul);
      formData.append("file", file);
      await apiFetch("/api/materi", {
        method: "POST",
        body: formData,
      });
      setJudul("");
      setFile(null);
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      await loadMateri();
    } catch (err: any) {
      setError(err.message || "Gagal mengunggah materi.");
    } finally {
      setLoading(false);
    }
  }

  const columns: Column<Materi>[] = [
    {
      key: "id",
      header: "#",
      className: "font-mono text-xs text-[var(--ink-muted)] w-12",
      render: (_, idx) => idx + 1,
    },
    {
      key: "judul",
      header: "Judul Materi",
      className: "font-medium text-[var(--ink)]",
      render: (item) => item.judul,
    },
    {
      key: "created_at",
      header: "Tanggal Unggah",
      className: "font-mono text-xs tabular-nums text-[var(--ink-muted)] w-40",
      render: (item) =>
        new Date(item.created_at).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Materi Ajar"
        description="Dokumen rujukan kurikulum dan materi pembelajaran sebagai sumber penyusunan butir soal."
      />

      <section className="border border-[var(--line)] bg-[var(--surface)] p-6 mb-8 w-full rounded-lg">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] mb-1">
          Unggah Materi Baru
        </h2>
        <p className="text-xs text-[var(--ink-muted)] mb-5">
          Teks materi akan dipecah secara semantik untuk referensi konteks agen AI.
        </p>

        <form onSubmit={handleUpload} className="flex flex-col gap-5">
          <Input
            label="Judul Materi Pembelajaran"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Contoh: Bab 3 - Dinamika Gerak dan Hukum Newton"
            helper="Tuliskan nama bab atau topik yang spesifik dan jelas"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--ink)]">
              Berkas Naskah Materi
            </label>
            <div className="relative border border-dashed border-[var(--line-strong)] bg-[var(--canvas)] rounded-lg py-9 px-6 text-center transition-colors hover:border-[var(--accent)] group cursor-pointer">
              <input
                id="file-input"
                type="file"
                accept=".txt,.md,.text,.pdf,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                required
              />
              <div className="space-y-1.5">
                <div className="text-sm text-[var(--ink)]">
                  {file ? (
                    <span className="font-medium text-[var(--accent)]">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  ) : (
                    <span className="group-hover:text-[var(--accent)] transition-colors">
                      Klik untuk memilih berkas atau seret ke sini
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--ink-muted)]">
                  Format berkas: Dokumen PDF (.pdf), Teks (.txt, .md) UTF-8
                </p>
              </div>
            </div>
            <span className="text-xs text-[var(--ink-muted)]">
              Berkas PDF otomatis dikonversi menjadi Markdown secara deterministik sebelum diindeks ke dalam potongan materi (chunks).
            </span>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-[#FBEAEA] border border-[#A4262C]/30 text-xs text-[#A4262C]">
              {error}
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" disabled={loading} size="md">
              {loading ? "Menyimpan Berkas..." : "Unggah & Simpan Materi"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-normal text-[var(--ink)] tracking-tight">
          Daftar Materi Terdaftar
        </h2>
        <Table
          columns={columns}
          data={materiList}
          emptyMessage="Belum ada materi pembelajaran yang diunggah. Unggah materi pertama di atas."
        />
      </section>
    </div>
  );
}
