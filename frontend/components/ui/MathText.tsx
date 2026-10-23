"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import "katex/contrib/mhchem";
import "katex/dist/katex.min.css";

export interface MathTextProps {
  text: string;
  className?: string;
  /**
   * false untuk pratinjau sempit (mis. sidebar): rumus yang kelewat lebar dipotong
   * tanpa scrollbar, bukan dijadikan kotak gulir.
   */
  gulir?: boolean;
}

type Segment =
  | { kind: "teks"; value: string }
  | { kind: "rumus"; value: string; display: boolean };

// \( ... \)  \[ ... \]  $$ ... $$  $ ... $
// `$ ... $` mengikuti aturan pandoc (tidak diawali/diakhiri spasi, tidak diikuti angka)
// agar tidak salah mengenali nominal seperti "$5 dan $10".
const POLA_RUMUS =
  /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\$(?!\s)((?:[^$\\]|\\.)+?)(?<!\s)\$(?!\d)/g;

function pecah(text: string): Segment[] {
  const hasil: Segment[] = [];
  let terakhir = 0;
  for (const m of text.matchAll(POLA_RUMUS)) {
    const awal = m.index ?? 0;
    if (awal > terakhir) {
      hasil.push({ kind: "teks", value: text.slice(terakhir, awal) });
    }
    const display = m[2] !== undefined || m[3] !== undefined;
    const isi = (m[1] ?? m[2] ?? m[3] ?? m[4] ?? "").trim();
    hasil.push({ kind: "rumus", value: isi, display });
    terakhir = awal + m[0].length;
  }
  if (terakhir < text.length) {
    hasil.push({ kind: "teks", value: text.slice(terakhir) });
  }
  return hasil;
}

function renderRumus(isi: string, display: boolean): string | null {
  try {
    return katex.renderToString(isi, {
      displayMode: display,
      throwOnError: true,
      strict: "ignore",
    });
  } catch {
    return null;
  }
}

function Rumus({
  html,
  display,
  bolehGulir,
}: {
  html: string;
  display: boolean;
  bolehGulir: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [gulir, setGulir] = useState(false);

  // Kotak hanya menjadi area gulir bila rumusnya benar-benar lebih lebar dari
  // wadahnya. Yang diukur lebar kotak layout .katex, bukan scrollWidth: scrollWidth ikut
  // menghitung ujung panah \ce yang position:absolute (hiasan 5-8px) sehingga
  // memunculkan scrollbar padahal tidak ada yang terpotong.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ukur = () => {
      const isi = el.querySelector(".katex");
      setGulir(!!isi && isi.getBoundingClientRect().width > el.clientWidth + 1);
    };
    ukur();
    const pengamat = new ResizeObserver(ukur);
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [html]);

  // `relative` wajib: KaTeX memakai elemen position:absolute (MathML aksesibilitas,
  // panah \ce). Tanpa ancestor ber-position elemen itu menempel ke dokumen dan
  // memperpanjang halaman sehingga muncul scrollbar jendela.
  return (
    <span
      ref={ref}
      className={`relative max-w-full align-middle ${
        display ? "block my-2" : "inline-block"
      } ${
        gulir
          ? bolehGulir
            ? "overflow-x-auto overflow-y-hidden py-0.5 [scrollbar-width:thin]"
            : "overflow-hidden"
          : ""
      }`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Menampilkan teks soal dengan rumus LaTeX (kimia lewat \ce{...}) yang dirender KaTeX.
 * Bagian non-rumus tetap berupa teks biasa. Rumus yang tidak valid ditampilkan apa
 * adanya agar naskah tetap terbaca.
 */
export default function MathText({ text, className = "", gulir = true }: MathTextProps) {
  const segmen = useMemo(() => pecah(text || ""), [text]);

  return (
    <span className={`[&_.katex]:text-[1.05em] ${className}`}>
      {segmen.map((seg, i) => {
        if (seg.kind === "teks") return <span key={i}>{seg.value}</span>;

        const html = renderRumus(seg.value, seg.display);
        if (html === null) {
          return (
            <span key={i} className="font-mono text-[0.9em]">
              {seg.value}
            </span>
          );
        }
        return <Rumus key={i} html={html} display={seg.display} bolehGulir={gulir} />;
      })}
    </span>
  );
}
