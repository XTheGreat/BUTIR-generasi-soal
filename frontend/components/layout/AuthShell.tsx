import React from "react";
import Link from "next/link";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col lg:flex-row text-[var(--ink)]">
      
      <div className="lg:w-[480px] xl:w-[540px] shrink-0 bg-[var(--surface)] border-b lg:border-b-0 lg:border-r border-[var(--line)] p-8 lg:p-14 flex flex-col justify-between">
        <div>
          <div className="mb-10">
            <Link href="/" className="inline-block focus-visible:outline-none">
              <span className="font-serif text-3xl font-medium tracking-tight text-[var(--ink)] block">
                BUTIR
              </span>
              <span className="text-xs text-[var(--ink-muted)] block mt-0.5 font-sans">
                Sistem Naskah Ujian
              </span>
            </Link>
          </div>

          <p className="text-sm text-[var(--ink)] leading-relaxed mb-10 max-w-sm">
            Sistem validasi dan standardisasi butir soal ujian akademik berbasis simulasi deliberasi agen kecerdasan buatan.
          </p>

          <div className="border-t border-[var(--line)] pt-8">
            <div className="text-xs font-medium text-[var(--ink-muted)] mb-4 font-sans">
              Alur Kerja Sistem
            </div>
            <ol className="space-y-4 text-xs text-[var(--ink)]">
              <li className="flex items-start gap-3">
                <span className="font-mono text-[var(--ink-muted)] text-[11px] pt-0.5">
                  01
                </span>
                <div>
                  <span className="font-medium block text-[var(--ink)]">
                    Penyusunan Kisi-kisi
                  </span>
                  <span className="text-[var(--ink-muted)] leading-normal block mt-0.5">
                    Penetapan materi ajar dan proporsi Taksonomi Bloom (C1–C6).
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-[var(--ink-muted)] text-[11px] pt-0.5">
                  02
                </span>
                <div>
                  <span className="font-medium block text-[var(--ink)]">
                    Debat Multi-Agen
                  </span>
                  <span className="text-[var(--ink-muted)] leading-normal block mt-0.5">
                    Telaah kritis empat agen (Penyusun, Kritikus, Penjawab Buta, Arbiter).
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-mono text-[var(--ink-muted)] text-[11px] pt-0.5">
                  03
                </span>
                <div>
                  <span className="font-medium block text-[var(--ink)]">
                    Perakitan & Evaluasi
                  </span>
                  <span className="text-[var(--ink-muted)] leading-normal block mt-0.5">
                    Penerbitan kode ujian siswa dan kalibrasi empiris daya beda butir.
                  </span>
                </div>
              </li>
            </ol>
          </div>
        </div>

        <div className="text-[11px] text-[var(--ink-muted)] font-mono pt-8 border-t border-[var(--line)] mt-8 lg:mt-0">
          Standar Evaluasi Naskah Akademik
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[360px]">
          <div className="mb-6">
            <h1 className="font-serif text-2xl font-normal text-[var(--ink)] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[var(--ink-muted)] mt-1.5 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {children}

          {footer && (
            <div className="mt-8 pt-4 border-t border-[var(--line)] text-xs text-[var(--ink-muted)] text-center">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
