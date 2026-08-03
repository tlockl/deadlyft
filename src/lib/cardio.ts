/**
 * Cardio is measured in time rather than in reps and weight, so none of the
 * volume rules in lib/volume.ts apply to it. This file holds the handful of
 * rules that do.
 *
 * Deliberately free of `server-only`: the logger runs these same functions in
 * the browser to keep its running totals live while a timer ticks.
 */

/** A day. Long enough for an ultra, short enough to catch a stuck timer. */
export const MAX_CARDIO_SECONDS = 24 * 60 * 60;

export type CardioLike = { durationSec: number; targetSec: number | null };

/**
 * Which of the two timers produced this entry. A countdown always leaves the
 * target it was set to behind; an open-ended count-up has nothing to leave.
 */
export function isCountdown(entry: CardioLike): boolean {
  return entry.targetSec !== null;
}

/** Whether a countdown actually ran out, rather than being stopped early. */
export function hitTarget(entry: CardioLike): boolean {
  return entry.targetSec !== null && entry.durationSec >= entry.targetSec;
}

export function cardioSeconds(entries: CardioLike[]): number {
  return entries.reduce((total, entry) => total + entry.durationSec, 0);
}

/**
 * The middle chunk of a workout's one-line summary.
 *
 * Sets win when there are any, because this app is a lifting log first and the
 * line truncates on a narrow phone. Cardio only takes the slot when it would
 * otherwise read "0 sets" -- which is exactly the run-only workout that the
 * count-up timer exists to record.
 */
export function activitySummary(setCount: number, cardioCount: number): string {
  if (setCount > 0) return `${setCount} set${setCount === 1 ? "" : "s"}`;
  if (cardioCount > 0) {
    return `${cardioCount} cardio`;
  }
  return "0 sets";
}
