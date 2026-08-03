import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "@/components/icons";

/** iOS large-title header. */
export function LargeTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-3 px-4 pt-3 pb-2">
      <div className="min-w-0">
        {subtitle && (
          <p className="text-[13px] font-medium text-label2">{subtitle}</p>
        )}
        <h1 className="truncate text-[34px] leading-[41px] font-bold tracking-[-0.4px]">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

/** The grey uppercase caption above an inset grouped list. */
export function SectionHeader({
  children,
  trailing,
}: {
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between px-4 pt-5 pb-2">
      <h2 className="text-[13px] font-normal text-label2 uppercase tracking-[0.5px]">
        {children}
      </h2>
      {trailing}
    </div>
  );
}

/** An inset grouped list card. Children are rows; separators are drawn between them. */
export function InsetGroup({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-4 overflow-hidden rounded-[10px] bg-surface ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * A tappable list row with the iOS disclosure chevron. The separator is inset
 * from the left to line up with the row's text, as it is in a UITableView.
 */
export function LinkRow({
  href,
  title,
  subtitle,
  trailing,
  last = false,
}: {
  href: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  last?: boolean;
}) {
  return (
    <Link href={href} className="ios-press flex items-center gap-3 pl-4 active:bg-press">
      <div
        className={`flex min-w-0 flex-1 items-center gap-3 py-[11px] pr-4 ${
          last ? "" : "border-b border-separator"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] leading-[22px]">{title}</p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[13px] leading-[18px] text-label2">
              {subtitle}
            </p>
          )}
        </div>
        {trailing && (
          <span className="shrink-0 text-[15px] tabular text-label2">
            {trailing}
          </span>
        )}
        <ChevronRightIcon className="h-[15px] w-[15px] shrink-0 text-label3" />
      </div>
    </Link>
  );
}

/** A read-only list row: label on the left, value on the right. */
export function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 pl-4">
      <div
        className={`flex flex-1 items-center justify-between gap-3 py-[11px] pr-4 ${
          last ? "" : "border-b border-separator"
        }`}
      >
        <span className="text-[17px]">{label}</span>
        <span className="text-[17px] tabular text-label2">{value}</span>
      </div>
    </div>
  );
}

/** Big number tile used for lifetime totals. */
export function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-[10px] bg-surface px-4 py-3">
      <p className="text-[13px] leading-[18px] text-label2">{label}</p>
      <p className="mt-1 text-[24px] leading-[29px] font-semibold tabular tracking-[-0.3px]">
        {value}
        {unit && (
          <span className="ml-1 text-[15px] font-medium text-label2">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

/** Full-width filled button, 50pt tall like a primary iOS call to action. */
export function FilledButton({
  children,
  type = "button",
  disabled,
  onClick,
  tone = "accent",
  className = "",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  tone?: "accent" | "danger";
  className?: string;
}) {
  const bg = tone === "danger" ? "bg-danger" : "bg-accent";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`ios-tap flex h-[50px] w-full items-center justify-center rounded-[12px] ${bg} text-[17px] font-semibold text-white disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center px-10 py-14 text-center">
      <div className="text-label3">{icon}</div>
      <p className="mt-3 text-[17px] font-semibold">{title}</p>
      <p className="mt-1 text-[15px] leading-[20px] text-label2">{body}</p>
    </div>
  );
}
