import React from "react";

export interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return (
    <div
      className={`bg-[var(--line)]/60 rounded ${className}`}
      aria-hidden="true"
    />
  );
}
