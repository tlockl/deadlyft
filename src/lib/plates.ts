import type { WeightUnit } from "@/generated/prisma/enums";

/**
 * Loading a bar or a plate-loaded machine, so a weight can be tapped in as the
 * plates you actually hung rather than added up in your head between sets.
 *
 * Everything here works in the user's display unit, not kilograms: you load a
 * 45 lb plate, not a 20.4 kg one, and converting would put fractions on the
 * buttons. `WorkoutLogger` converts the resulting total the same way it
 * converts a typed one.
 *
 * Arithmetic is done in tenths of a unit throughout. A 2.5 plate can't be
 * represented exactly in binary floating point, and eight of them should come
 * to 20 rather than 19.999999999999996.
 */

/** Plates you'd actually find on a rack, heaviest first. */
const PLATES: Record<WeightUnit, number[]> = {
  LB: [45, 35, 25, 10, 5, 2.5],
  KG: [25, 20, 15, 10, 5, 2.5],
};

/**
 * Bar options. Zero comes first and is the default, because a plate-loaded
 * machine's own starting resistance is unknowable and conventionally ignored --
 * only the barbell lifts have a number worth adding.
 */
const BARS: Record<WeightUnit, number[]> = {
  LB: [0, 45, 35],
  KG: [0, 20, 15],
};

export const platesFor = (unit: WeightUnit): number[] => PLATES[unit];
export const barsFor = (unit: WeightUnit): number[] => BARS[unit];

/** How many of each plate hang on one side. Keyed by the plate's own value. */
export type PlateCounts = Record<number, number>;

const tenths = (value: number) => Math.round(value * 10);

/** What a loadout weighs in total: the bar, plus the plates on every side. */
export function loadoutTotal(
  counts: PlateCounts,
  bar: number,
  perSide: boolean,
): number {
  const sides = perSide ? 2 : 1;
  const plateTenths = Object.entries(counts).reduce(
    (sum, [plate, count]) => sum + tenths(Number(plate)) * count,
    0,
  );
  return (tenths(bar) + plateTenths * sides) / 10;
}

/**
 * The plates that make up a weight, or null if none do.
 *
 * This is what lets the panel open already showing what's on the bar, so
 * adding one more plate to the last set is a single tap. Greedy is exact here:
 * the denominations step down through 2.5, so any multiple of 2.5 that's left
 * over can always be filled.
 *
 * Returns null for anything that doesn't land on the plates available -- an odd
 * number typed by hand, or a machine's stack weight. The panel then starts
 * empty rather than pretending an approximation is what you loaded.
 */
export function decompose(
  total: number,
  bar: number,
  perSide: boolean,
  plates: number[],
): PlateCounts | null {
  const sides = perSide ? 2 : 1;
  const perSideTenths = (tenths(total) - tenths(bar)) / sides;

  if (perSideTenths < 0 || !Number.isInteger(perSideTenths)) return null;
  if (perSideTenths === 0) return {};

  const counts: PlateCounts = {};
  let remaining = perSideTenths;

  for (const plate of plates) {
    const size = tenths(plate);
    const count = Math.floor(remaining / size);
    if (count > 0) {
      counts[plate] = count;
      remaining -= count * size;
    }
  }

  return remaining === 0 ? counts : null;
}

/** "45 × 2, 10 × 1", or null when nothing is loaded. */
export function describeLoadout(counts: PlateCounts): string | null {
  const parts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([plate, count]) => `${plate} × ${count}`);

  return parts.length > 0 ? parts.join(", ") : null;
}
