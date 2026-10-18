"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { PanelLeftClose } from "lucide-react";

interface NavGroup {
  group?: string;
  items: {
    href: string;
    label: string;
    isMarkedCount?: boolean;
  }[];
}

const navGroups: NavGroup[] = [
  {
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    group: "Persiapan",
    items: [
      { href: "/materi", label: "Materi Ajar" },
      { href: "/kisi-kisi", label: "Kisi-kisi" },
    ],
  },
  {
    group: "Telaah",
    items: [
      { href: "/butir-ditandai", label: "Butir Ditandai", isMarkedCount: true },
      { href: "/bank-soal", label: "Bank Soal" },
    ],
  },
  {
    group: "Ujian",
    items: [{ href: "/rakit-ujian", label: "Rakit Ujian" }],
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void;
}

export default function Sidebar({
  isOpen = true,
  onClose,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const [markedCount, setMarkedCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiFetch("/api/butir?status=ditandai")
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setMarkedCount(data.length);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const navInner = (
    <div className="w-[240px] h-full flex flex-col justify-between border-r border-[var(--line)] bg-[var(--canvas)] select-none">
      
      <div>
        <div className="px-5 py-4 border-b border-[var(--accent)] bg-[var(--accent)] flex items-center justify-between">
          <Link
            href="/dashboard"
            className="block focus-visible:outline-none group"
          >
            <span className="font-serif text-xl font-medium tracking-tight text-white block">
              BUTIR
            </span>
            <span className="font-sans text-[11px] text-white/80 block mt-0.5">
              Sistem Validasi Naskah
            </span>
          </Link>
          <button
            onClick={onToggle || onClose}
            className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none"
            aria-label="Tutup navigasi"
            title="Tutup bilah samping"
          >
            <PanelLeftClose size={16} strokeWidth={1.5} />
          </button>
        </div>

        <nav className="py-4 px-3 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.group && (
                <div className="px-3 pt-2 pb-1 text-[11px] font-sans font-semibold text-[var(--ink-muted)]">
                  {group.group}
                </div>
              )}
              {group.items.map((item) => {
                const active =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center justify-between px-3 py-2 text-[15px] font-serif transition-colors ${
                      active
                        ? "text-[var(--ink)] font-medium"
                        : "text-[var(--ink-muted)] hover:text-[var(--ink)] font-normal"
                    }`}
                  >
                    <div className="relative inline-flex flex-col items-start min-w-0">
                      <span className="truncate">{item.label}</span>
                      <span
                        className={`h-[1.5px] bg-[var(--accent)] transition-all duration-300 ease-out origin-left mt-0.5 ${
                          active
                            ? "w-full"
                            : "w-0 group-hover:w-full group-hover:opacity-30"
                        }`}
                      />
                    </div>

                    {item.isMarkedCount &&
                      markedCount !== null &&
                      markedCount > 0 && (
                        <span className="font-sans text-[11px] px-1.5 py-0.2 rounded bg-[var(--canvas)] text-[#8A5A00] border border-[#8A5A00]/30 font-semibold tabular-nums shrink-0">
                          {markedCount}
                        </span>
                      )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-[var(--line)] text-[11px] text-[var(--ink-muted)] font-sans">
        BUTIR v1.0
      </div>
    </div>
  );

  return (
    <>
      
      <aside
        className={`hidden md:block sticky top-0 h-screen shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30 ${
          isOpen
            ? "w-[240px] opacity-100"
            : "w-0 opacity-0 pointer-events-none"
        }`}
      >
        {navInner}
      </aside>

      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-[var(--ink)]/40 backdrop-blur-xs transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={`fixed top-0 bottom-0 left-0 z-10 transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {navInner}
        </div>
      </div>
    </>
  );
}
