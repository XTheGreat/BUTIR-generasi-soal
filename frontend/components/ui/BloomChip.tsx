import React from "react";

export interface BloomChipProps {
  level: string;
  className?: string;
}

export default function BloomChip({ level, className = "" }: BloomChipProps) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-['Times_New_Roman',Times,serif] font-medium bg-[var(--surface)] text-[var(--ink-muted)] border border-[var(--line)] ${className}`}
    >
      {level}
    </span>
  );
}
