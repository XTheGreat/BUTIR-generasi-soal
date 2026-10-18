import React from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`border border-[var(--line)] bg-[var(--surface)] p-8 text-center rounded-lg ${className}`}
    >
      <h3 className="font-serif text-base font-normal text-[var(--ink)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[var(--ink-muted)] max-w-sm mx-auto mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
