import "server-only";
import { prisma } from "@/lib/prisma";
import type { BodyMetricKind, WeightUnit } from "@/generated/prisma/enums";
import { fromKg, toKg, unitLabel, formatWeight } from "@/lib/units";

/**
 * Body measurements: weight, height and body fat.
 *
 * `BodyMetric.value` is a bare number whose meaning depends on `kind`. This
 * file is the one place that knows what it means -- kilograms, centimetres or
 * percent -- and nothing outside it should touch a raw value without going
 * through `chartValue` or `formatMetric`. Same bargain as weights being
 * canonical in kg: store one number, convert on the way out.
 */

const CM_PER_INCH = 2.54;
const INCHES_PER_FOOT = 12;

/** Display order, which is also the order of the chart's segmented control. */
export const BODY_METRIC_KINDS = ["WEIGHT", "HEIGHT", "BODY_FAT"] as const;

type MetricMeta = {
  label: string;
  /** What `value` is stored in. */
  canonicalUnit: string;
  /**
   * Sanity bounds, checked after conversion to the canonical unit. These are
   * wide on purpose: they exist to catch a slipped decimal point or a weight
   * typed in the height box, not to have an opinion about anyone's body.
   */
  min: number;
  max: number;
};

export const BODY_METRICS: Record<BodyMetricKind, MetricMeta> = {
  WEIGHT: { label: "Weight", canonicalUnit: "kg", min: 20, max: 500 },
  HEIGHT: { label: "Height", canonicalUnit: "cm", min: 50, max: 260 },
  BODY_FAT: { label: "Body fat", canonicalUnit: "%", min: 1, max: 75 },
};

// -- Height ----------------------------------------------------------------
//
// Height has no unit preference of its own: it follows the weight unit, so a
// user set to lb enters feet and inches and a user set to kg enters
// centimetres. Someone who wants kilograms with feet is not served by this,
// which is a deliberate trade against a second setting that would be a
// near-duplicate of the first.

export function fromCm(cm: number, unit: WeightUnit): number {
  return unit === "KG" ? cm : cm / CM_PER_INCH;
}

export function toCm(value: number, unit: WeightUnit): number {
  return unit === "KG" ? value : value * CM_PER_INCH;
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * INCHES_PER_FOOT + inches) * CM_PER_INCH;
}

/** Splits a stored height back into the two boxes an imperial user typed it in. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return {
    feet: Math.floor(totalInches / INCHES_PER_FOOT),
    inches: totalInches % INCHES_PER_FOOT,
  };
}

export function formatHeight(cm: number, unit: WeightUnit): string {
  if (unit === "KG") return `${Math.round(cm * 10) / 10} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′ ${inches}″`;
}

// -- Cross-metric display --------------------------------------------------

/** A measurement written out in full, e.g. "182.5 lb", "5′ 11″", "18.2%". */
export function formatMetric(
  kind: BodyMetricKind,
  value: number,
  unit: WeightUnit,
): string {
  switch (kind) {
    case "WEIGHT":
      return formatWeight(value, unit);
    case "HEIGHT":
      return formatHeight(value, unit);
    case "BODY_FAT":
      return `${Math.round(value * 10) / 10}%`;
  }
}

/**
 * The number this metric plots as. Height plots in whole inches for an
 * imperial user rather than feet-and-inches: a chart axis needs a single
 * number, and 5′ 11″ isn't one.
 */
export function chartValue(
  kind: BodyMetricKind,
  value: number,
  unit: WeightUnit,
): number {
  switch (kind) {
    case "WEIGHT":
      return fromKg(value, unit);
    case "HEIGHT":
      return fromCm(value, unit);
    case "BODY_FAT":
      return value;
  }
}

/** The suffix the chart prints after `chartValue`. */
export function chartUnit(kind: BodyMetricKind, unit: WeightUnit): string {
  switch (kind) {
    case "WEIGHT":
      return unitLabel(unit);
    case "HEIGHT":
      return unit === "KG" ? "cm" : "in";
    case "BODY_FAT":
      return "%";
  }
}

/** Turns what the user typed into the canonical unit for that metric. */
export function toCanonical(
  kind: BodyMetricKind,
  value: number,
  unit: WeightUnit,
): number {
  switch (kind) {
    case "WEIGHT":
      return toKg(value, unit);
    case "HEIGHT":
      return toCm(value, unit);
    case "BODY_FAT":
      return value;
  }
}

/** Local calendar day as "YYYY-MM-DD", for the date input's value and max. */
export function todayKey(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// -- Derived ---------------------------------------------------------------

/**
 * Body mass index, derived on read from the latest weight and height rather
 * than stored -- the same rule as workout volume, for the same reason.
 *
 * Presented as a bare number with no category attached. BMI cannot tell muscle
 * from fat, so in an app whose whole purpose is adding muscle it would be
 * actively misleading to label anyone "overweight" on the strength of it.
 */
export function bmi(weightKg: number, heightCm: number): number | null {
  if (heightCm <= 0) return null;
  const metres = heightCm / 100;
  return weightKg / (metres * metres);
}

/**
 * How much a metric moved over the trailing `days`, in canonical units, or
 * null if there aren't two readings in that window to compare.
 */
export function trailingChange(points: BodyPoint[], days: number): number | null {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const window = points.filter((point) => point.recordedAt.getTime() >= since);
  if (window.length < 2) return null;
  return window[window.length - 1].value - window[0].value;
}

// -- Loading ---------------------------------------------------------------

export type BodyPoint = {
  id: string;
  value: number;
  recordedAt: Date;
};

export type BodyEntry = BodyPoint & { kind: BodyMetricKind };

export type BodyLog = {
  /** Per metric, oldest first, ready to plot. */
  series: Record<BodyMetricKind, BodyPoint[]>;
  /** Per metric, the most recent reading, if there is one. */
  latest: Partial<Record<BodyMetricKind, BodyPoint>>;
  /** Everything, newest first, for the history list. */
  entries: BodyEntry[];
  total: number;
};

/**
 * The most recent reading of one metric, for screens that want a single number
 * and shouldn't pay for the whole log to get it.
 */
export async function getLatestMetric(
  userId: string,
  kind: BodyMetricKind,
): Promise<BodyPoint | null> {
  return prisma.bodyMetric.findFirst({
    where: { userId, kind },
    orderBy: { recordedAt: "desc" },
    select: { id: true, value: true, recordedAt: true },
  });
}

/**
 * Every measurement a user has logged, in one query and grouped in JS. Even a
 * daily weigh-in kept up for years is a few thousand rows, so three round
 * trips to filter by kind would cost more than they saved.
 */
export async function getBodyLog(userId: string): Promise<BodyLog> {
  const rows = await prisma.bodyMetric.findMany({
    where: { userId },
    select: { id: true, kind: true, value: true, recordedAt: true },
    orderBy: { recordedAt: "asc" },
  });

  const series: Record<BodyMetricKind, BodyPoint[]> = {
    WEIGHT: [],
    HEIGHT: [],
    BODY_FAT: [],
  };

  for (const row of rows) {
    series[row.kind].push({
      id: row.id,
      value: row.value,
      recordedAt: row.recordedAt,
    });
  }

  const latest: Partial<Record<BodyMetricKind, BodyPoint>> = {};
  for (const kind of BODY_METRIC_KINDS) {
    latest[kind] = series[kind].at(-1);
  }

  return {
    series,
    latest,
    entries: [...rows].reverse(),
    total: rows.length,
  };
}
