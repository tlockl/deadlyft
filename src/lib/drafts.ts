"use client";

import { useSyncExternalStore } from "react";

/**
 * The in-progress workout: its shape, and how it survives you leaving the page.
 *
 * A draft lives in the browser rather than the database. The server only ever
 * sees a finished workout, which is what keeps `finishWorkout` a single
 * wholesale write and keeps the app from doing a round trip per keystroke.
 * The cost of that is a draft with nowhere to be when the logger unmounts, so
 * it is mirrored into localStorage on every change and read back on mount.
 *
 * localStorage rather than sessionStorage on purpose: sessionStorage dies with
 * the tab, and "iOS killed the app while I was reading a text between sets" is
 * exactly the case worth surviving.
 */

export type SetDraft = { id: string; reps: string; weight: string };
export type ExerciseDraft = { id: string; name: string; sets: SetDraft[] };

export type CardioDraft = {
  id: string;
  name: string;
  /** Countdown to a target, versus counting up with no fixed end. */
  countdown: boolean;
  /** Target, as typed. Kept as text so a half-typed "1" isn't read as 1 minute. */
  targetMinutes: string;
  targetSeconds: string;
  /**
   * Absolute epoch time the current run began, or null while paused.
   *
   * Absolute, not a duration, is what lets a restored timer carry on: the time
   * that passed while the logger was unmounted is already accounted for by the
   * subtraction, with nothing having had to keep running to notice it.
   */
  runningSince: number | null;
  /** Time from previous runs, already banked. */
  bankedMs: number;
};

export type WorkoutDraft = {
  title: string;
  exercises: ExerciseDraft[];
  cardio: CardioDraft[];
};

// Ids only ever become React keys, so a plain counter beats randomness here —
// it stays identical between the server render and hydration.
let nextId = 0;
const uid = () => `d${nextId++}`;

/**
 * Keeps the counter ahead of a restored draft's ids.
 *
 * Without this, a page reload restarts the counter at zero while the restored
 * rows still hold "d0", "d1", ... and the next set added collides with one of
 * them -- duplicate React keys, and edits landing on the wrong row.
 */
function reserveId(id: string): string {
  const parsed = Number.parseInt(id.slice(1), 10);
  if (Number.isFinite(parsed) && parsed >= nextId) nextId = parsed + 1;
  return id;
}

export const emptySet = (): SetDraft => ({ id: uid(), reps: "", weight: "" });

export const emptyExercise = (): ExerciseDraft => ({
  id: uid(),
  name: "",
  sets: [emptySet()],
});

// Countdown is the default because it's the one that needs a number typed into
// it, and 20 minutes is a plausible enough block that most sessions can just
// hit Start. Counting up needs no setup, so it costs nothing to switch to.
export const emptyCardio = (): CardioDraft => ({
  id: uid(),
  name: "",
  countdown: true,
  targetMinutes: "20",
  targetSeconds: "",
  runningSince: null,
  bankedMs: 0,
});

export function cardioTargetMs(draft: CardioDraft): number {
  if (!draft.countdown) return 0;
  const minutes = Number.parseInt(draft.targetMinutes, 10) || 0;
  const seconds = Number.parseInt(draft.targetSeconds, 10) || 0;
  return (minutes * 60 + seconds) * 1000;
}

export function cardioElapsedMs(draft: CardioDraft, now: number): number {
  const running = draft.runningSince === null ? 0 : now - draft.runningSince;
  // The shared clock can be a tick behind the timestamp taken on the tap that
  // started the run, which would otherwise read as a negative first frame.
  return Math.max(0, draft.bankedMs + running);
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const KEY_PREFIX = "deadlyft:draft:";

// Bump when the draft shape changes in a way an older stored copy can't satisfy.
// Restoring half-understood state into the logger is worse than starting empty.
const VERSION = 1;

const keyFor = (workoutId: string) => `${KEY_PREFIX}${workoutId}`;

/**
 * Anything read back out of storage is untrusted: it was written by an older
 * version of this app, or edited by hand, or truncated by a browser reclaiming
 * space. A NaN reaching `bankedMs` would render the timer as "NaN:NaN" with no
 * way back, so every field is checked rather than cast.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const isText = (value: unknown): value is string => typeof value === "string";

const isCount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

function parseSet(value: unknown): SetDraft | null {
  if (!isRecord(value)) return null;
  const { id, reps, weight } = value;
  if (!isText(id) || !isText(reps) || !isText(weight)) return null;
  return { id: reserveId(id), reps, weight };
}

function parseExercise(value: unknown): ExerciseDraft | null {
  if (!isRecord(value)) return null;
  const { id, name, sets } = value;
  if (!isText(id) || !isText(name) || !Array.isArray(sets)) return null;

  const parsed = sets.map(parseSet);
  if (parsed.some((set) => set === null)) return null;

  return { id: reserveId(id), name, sets: parsed as SetDraft[] };
}

function parseCardio(value: unknown): CardioDraft | null {
  if (!isRecord(value)) return null;
  const {
    id,
    name,
    countdown,
    targetMinutes,
    targetSeconds,
    runningSince,
    bankedMs,
  } = value;

  if (!isText(id) || !isText(name) || typeof countdown !== "boolean") {
    return null;
  }
  if (!isText(targetMinutes) || !isText(targetSeconds)) return null;
  if (runningSince !== null && !isCount(runningSince)) return null;
  if (!isCount(bankedMs)) return null;

  return {
    id: reserveId(id),
    name,
    countdown,
    targetMinutes,
    targetSeconds,
    runningSince,
    bankedMs,
  };
}

/**
 * The draft saved against this workout, or null if there isn't a usable one.
 *
 * A stored draft that fails any check is discarded whole rather than partially
 * restored: a logger showing three of your five sets is harder to trust, and
 * harder to notice, than one that is plainly empty.
 */
export function loadDraft(workoutId: string): WorkoutDraft | null {
  try {
    const raw = window.localStorage.getItem(keyFor(workoutId));
    if (!raw) return null;

    const stored: unknown = JSON.parse(raw);
    if (!isRecord(stored) || stored.version !== VERSION) return null;
    if (!isText(stored.title)) return null;
    if (!Array.isArray(stored.exercises) || !Array.isArray(stored.cardio)) {
      return null;
    }

    const exercises = stored.exercises.map(parseExercise);
    const cardio = stored.cardio.map(parseCardio);
    if (exercises.some((e) => e === null) || cardio.some((c) => c === null)) {
      return null;
    }

    return {
      title: stored.title,
      exercises: exercises as ExerciseDraft[],
      cardio: cardio as CardioDraft[],
    };
  } catch {
    // Storage unavailable (Safari private mode), or the JSON is unparseable.
    return null;
  }
}

export function saveDraft(workoutId: string, draft: WorkoutDraft): void {
  // Written through to the cached snapshot, not just to storage. Leaving the
  // cache holding what was read when the page loaded would mean closing the
  // logger and reopening it -- a client-side navigation, so the cache survives
  // -- restored the draft as it was on arrival and threw away everything typed
  // since.
  firstRead.set(workoutId, draft);

  try {
    window.localStorage.setItem(
      keyFor(workoutId),
      JSON.stringify({ version: VERSION, ...draft }),
    );
  } catch {
    // Over quota, or storage is blocked. Losing the mirror is survivable;
    // taking the logger down with it is not.
  }
}

export function clearDraft(workoutId: string): void {
  firstRead.delete(workoutId);
  try {
    window.localStorage.removeItem(keyFor(workoutId));
  } catch {
    // As above.
  }
}

/**
 * The current draft per workout, as far as this page load knows.
 *
 * `useSyncExternalStore` requires a snapshot that stays identical between calls,
 * so this can't parse storage afresh each time it's asked -- two calls in one
 * render would hand back two different objects and React would spin. Storage is
 * therefore read once, on the first ask, and `saveDraft` keeps this in step
 * from then on.
 */
const firstRead = new Map<string, WorkoutDraft | null>();

/** Storage doesn't change underneath us; only this screen writes to it. */
const subscribeNever = () => () => {};

function snapshot(workoutId: string): WorkoutDraft | null {
  const cached = firstRead.get(workoutId);
  if (cached !== undefined) return cached;

  const draft = loadDraft(workoutId);
  firstRead.set(workoutId, draft);
  return draft;
}

/**
 * The saved draft for a workout.
 *
 * `undefined` means storage hasn't been read yet, which is the case for the
 * server render and the hydration pass that has to match it -- there is no
 * localStorage on the server, and reading it while rendering on the client
 * would make the two disagree. It settles to the draft, or to null when there
 * isn't one, on the render right after hydration.
 *
 * Modelled as a store rather than as state pushed from an effect for the same
 * reason the wall clock in lib/clock.ts is: it's a browser system this app
 * reads, not state this app owns.
 */
export function useSavedDraft(
  workoutId: string,
): WorkoutDraft | null | undefined {
  return useSyncExternalStore(
    subscribeNever,
    () => snapshot(workoutId),
    () => undefined,
  );
}

/**
 * Drops every other workout's draft.
 *
 * Only one workout can be ACTIVE at a time, so any other draft belongs to one
 * that was finished or discarded -- including the case where finishing
 * redirected before it could clean up after itself. Opening the next workout
 * collects it.
 */
export function pruneOtherDrafts(keepWorkoutId: string): void {
  try {
    const keep = keyFor(keepWorkoutId);
    const stale = Object.keys(window.localStorage).filter(
      (key) => key.startsWith(KEY_PREFIX) && key !== keep,
    );
    for (const key of stale) window.localStorage.removeItem(key);
  } catch {
    // As above.
  }
}
