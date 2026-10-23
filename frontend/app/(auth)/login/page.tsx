"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { saveToken, saveUser } from "@/lib/auth";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import AuthShell from "@/components/layout/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveToken(data.access_token);
      saveUser(data.user);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Periksa kembali email dan password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Masuk ke Akun"
      subtitle="Masukkan kredensial akun guru untuk mengakses lembar kerja."
      footer={
        <div className="space-y-1.5">
          <div>
            Belum memiliki akun?{" "}
            <Link
              href="/register"
              className="text-[var(--accent)] hover:underline font-medium"
            >
              Daftar baru
            </Link>
          </div>
          <div>
            <Link
              href="/reset-password"
              className="text-[var(--ink-muted)] hover:text-[var(--ink)] hover:underline"
            >
              Lupa password?
            </Link>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@study.id"
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        {error && (
          <div className="p-2.5 rounded bg-[#FBEAEA] border border-[#A4262C]/30 text-xs text-[#A4262C]">
            {error}
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "Memverifikasi..." : "Masuk"}
        </Button>
      </form>
    </AuthShell>
  );
}
