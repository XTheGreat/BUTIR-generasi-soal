"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthShell from "@/components/layout/AuthShell";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage("Token reset telah dikirim (periksa log terminal backend untuk mode dev).");
      setStep("reset");
    } catch (err: any) {
      setError(err.message || "Gagal memproses permintaan token.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      setMessage("Password berhasil diperbarui. Silakan masuk kembali.");
    } catch (err: any) {
      setError(err.message || "Gagal memperbarui password. Token mungkin sudah kedaluwarsa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Atur Ulang Password"
      subtitle={
        step === "request"
          ? "Masukkan alamat email terdaftar untuk menerima token pemulihan."
          : "Masukkan token yang diterima beserta password baru Anda."
      }
      footer={
        <div>
          <Link
            href="/login"
            className="text-[var(--ink-muted)] hover:text-[var(--ink)] hover:underline"
          >
            ← Kembali ke halaman masuk
          </Link>
        </div>
      }
    >
      {step === "request" ? (
        <form onSubmit={handleRequest} className="flex flex-col gap-4">
          <Input
            label="Email Terdaftar"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@madrasah.id"
            autoComplete="email"
            required
          />
          {error && (
            <div className="p-2.5 rounded bg-[#FBEAEA] border border-[#A4262C]/30 text-xs text-[#A4262C]">
              {error}
            </div>
          )}
          {message && (
            <div className="p-2.5 rounded bg-[#E8F3EB] border border-[#1F6B3A]/30 text-xs text-[#1F6B3A]">
              {message}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Mengirim..." : "Kirim Token Pemulihan"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <Input
            label="Token Pemulihan"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Salin token dari log backend"
            helper="Mode dev: token dicetak pada terminal server FastAPI"
            required
          />
          <Input
            label="Password Baru"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            minLength={6}
            required
          />
          {error && (
            <div className="p-2.5 rounded bg-[#FBEAEA] border border-[#A4262C]/30 text-xs text-[#A4262C]">
              {error}
            </div>
          )}
          {message && (
            <div className="p-2.5 rounded bg-[#E8F3EB] border border-[#1F6B3A]/30 text-xs text-[#1F6B3A]">
              {message}
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Menyimpan..." : "Simpan Password Baru"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
