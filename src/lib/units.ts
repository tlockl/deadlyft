import type { WeightUnit } from "@/generated/prisma/enums";

// Everything is stored in kilograms; the user's chosen unit only affects display
// and the parsing of what they type in.
const KG_PER_LB = 0.45359237;

// Formatting is pinned to a fixed locale rather than the ambient one. These
// strings are produced on the server and hydrated on the client, and the two
// don't necessarily agree on a default locale.
const LOCALE = "en-US";

export function unitLabel(unit: WeightUnit): string {
  return unit === "KG" ? "kg" : "lb";
}

export function fromKg(weightKg: number, unit: WeightUnit): number {
  return unit === "KG" ? weightKg : weightKg / KG_PER_LB;
}

export function toKg(weight: number, unit: WeightUnit): number {
  return unit === "KG" ? weight : weight * KG_PER_LB;
}

/** A single set's weight, e.g. "135 lb". */
export function formatWeight(weightKg: number, unit: WeightUnit): string {
  const value = fromKg(weightKg, unit);
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString(LOCALE)} ${unitLabel(unit)}`;
}

/** Cumulative weight moved (reps x weight), e.g. "12,480 lb". */
export function formatVolume(volumeKg: number, unit: WeightUnit): string {
  const value = Math.round(fromKg(volumeKg, unit));
  return `${value.toLocaleString(LOCALE)} ${unitLabel(unit)}`;
}

/** Bare number, for stat tiles that render the unit separately. */
export function formatVolumeValue(volumeKg: number, unit: WeightUnit): string {
  return Math.round(fromKg(volumeKg, unit)).toLocaleString(LOCALE);
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { timeStyle: "short" }).format(date);
}

/** Compact axis label, e.g. "Aug 1". */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Day label with a friendly name for the two most recent days, since almost
 * every workout you look at was logged today or yesterday.
 */
export function formatDayLabel(date: Date, now = new Date()): string {
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round(
    (startOfDay(now) - startOfDay(date)) / (24 * 60 * 60 * 1000),
  );

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";

  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** h:mm:ss stopwatch readout for an in-progress workout. */
export function formatStopwatch(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
