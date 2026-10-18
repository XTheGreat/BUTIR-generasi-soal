"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn()) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[var(--canvas)] text-[var(--ink-muted)] text-sm font-serif">
      <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse mr-2" />
      Memuat naskah BUTIR...
    </div>
  );
}
