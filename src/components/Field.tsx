import type { InputHTMLAttributes } from "react";

/**
 * A Settings-style form row: inline label on the left, field on the right,
 * hairline separator underneath (suppressed on the last row of a group).
 */
export default function Field({
  label,
  error,
  ...input
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="border-b border-separator last:border-b-0">
      <div className="flex items-center gap-3 px-4">
        <label htmlFor={input.id} className="w-[88px] shrink-0 text-[17px]">
          {label}
        </label>
        <input
          {...input}
          aria-invalid={error ? true : undefined}
          className="h-[46px] min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-label3"
        />
      </div>
      {error && (
        <p className="px-4 pb-2 text-[13px] leading-[18px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
