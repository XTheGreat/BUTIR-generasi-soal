import React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helper, error, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--ink)]">
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref}
          className={`bg-[var(--canvas)] text-[var(--ink)] border rounded px-3 py-2 text-sm placeholder:text-[var(--ink-muted)]/60 focus:outline-none focus:border-[var(--accent)] transition-colors duration-140 disabled:bg-[var(--surface)] disabled:cursor-not-allowed ${
            error
              ? "border-[#A4262C] focus:border-[#A4262C]"
              : "border-[var(--line-strong)]"
          } ${className}`}
          {...props}
        />
        {helper && !error && (
          <span className="text-xs text-[var(--ink-muted)]">{helper}</span>
        )}
        {error && <span className="text-xs text-[#A4262C]">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
