import "server-only";
import { prisma } from "@/lib/prisma";
import { setsVolumeKg } from "@/lib/volume";

/**
 * Exercise names are free text, so "Bench Press", "bench press" and
 * "  Bench Press " all mean the same movement. Everything groups on this key,
 * and the most recent spelling is what gets displayed.
 */
export function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

/** URL segment for a movement, e.g. "Pull-up / Chin-up" → "pull-up%20%2F%20chin-up". */
export function exerciseSlug(name: string): string {
  return encodeURIComponent(exerciseKey(name));
}

/**
 * Next hands dynamic segments over still percent-encoded, so a slug has to be
 * decoded before it can be matched back against a name.
 */
export function decodeExerciseSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    // Malformed escape — someone hand-typed a bare "%". Use it verbatim.
    return slug;
  }
}

export type ExerciseSet = { reps: number; weightKg: number };

/** One workout's worth of a single movement. */
export type ExerciseSession = {
  workoutId: string;
  workoutTitle: string | null;
  performedAt: Date;
  sets: ExerciseSet[];
  topWeightKg: number;
  volumeKg: number;
  totalReps: number;
};

export type ExerciseSummary = {
  key: string;
  name: string;
  sessionCount: number;
  lastPerformed: Date;
  bestWeightKg: number;
};

export type ExerciseHistory = {
  key: string;
  name: string;
  sessions: ExerciseSession[];
};

/**
 * Prisma has no case-insensitive matching on SQLite, so grouping happens in JS
 * over a narrow projection. A personal training log is small enough that this
 * is cheaper than the alternatives and keeps the name-matching rule in one place.
 */
async function loadExerciseRows(userId: string) {
  return prisma.exercise.findMany({
    where: { workout: { userId, status: "COMPLETED" } },
    select: {
      name: true,
      sets: {
        select: { reps: true, weightKg: true },
        orderBy: { position: "asc" },
      },
      workout: { select: { id: true, title: true, startedAt: true } },
    },
  });
}

/**
 * Which spelling of a movement to show, given every way the user has typed it.
 *
 * The most *frequent* spelling wins, not the most recent: typing "bench press"
 * in a hurry once shouldn't rename six months of "Bench Press". Ties go to
 * whichever was used most recently, so deliberately renaming a movement does
 * eventually take effect.
 */
function pickDisplayName(spellings: { text: string; at: Date }[]): string {
  const tally = new Map<string, { count: number; last: Date }>();

  for (const { text, at } of spellings) {
    const entry = tally.get(text);
    if (entry) {
      entry.count += 1;
      if (at > entry.last) entry.last = at;
    } else {
      tally.set(text, { count: 1, last: at });
    }
  }

  return [...tally.entries()].sort(
    (a, b) => b[1].count - a[1].count || b[1].last.getTime() - a[1].last.getTime(),
  )[0][0];
}

/** Every distinct movement the user has logged, most recently performed first. */
export async function getExerciseSummaries(
  userId: string,
): Promise<ExerciseSummary[]> {
  const rows = await loadExerciseRows(userId);

  const grouped = new Map<
    string,
    {
      spellings: { text: string; at: Date }[];
      workoutIds: Set<string>;
      lastPerformed: Date;
      bestWeightKg: number;
    }
  >();

  for (const row of rows) {
    const key = exerciseKey(row.name);
    const performedAt = row.workout.startedAt;
    const best = row.sets.reduce((max, set) => Math.max(max, set.weightKg), 0);

    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        spellings: [{ text: row.name.trim(), at: performedAt }],
        workoutIds: new Set([row.workout.id]),
        lastPerformed: performedAt,
        bestWeightKg: best,
      });
      continue;
    }

    existing.spellings.push({ text: row.name.trim(), at: performedAt });
    existing.workoutIds.add(row.workout.id);
    existing.bestWeightKg = Math.max(existing.bestWeightKg, best);
    if (performedAt > existing.lastPerformed) {
      existing.lastPerformed = performedAt;
    }
  }

  return [...grouped.entries()]
    .map(([key, value]) => ({
      key,
      name: pickDisplayName(value.spellings),
      sessionCount: value.workoutIds.size,
      lastPerformed: value.lastPerformed,
      bestWeightKg: value.bestWeightKg,
    }))
    .sort((a, b) => b.lastPerformed.getTime() - a.lastPerformed.getTime());
}

/**
 * Every session of one movement, oldest first so it can be plotted directly.
 * Returns null if the user has never logged it.
 */
export async function getExerciseHistory(
  userId: string,
  key: string,
): Promise<ExerciseHistory | null> {
  const rows = (await loadExerciseRows(userId)).filter(
    (row) => exerciseKey(row.name) === key,
  );

  if (rows.length === 0) return null;

  // The same movement can be added twice in one workout (say, a drop set added
  // later). That is still one session, so merge on workout id.
  const byWorkout = new Map<string, ExerciseSession>();
  const spellings: { text: string; at: Date }[] = [];

  for (const row of rows) {
    const { id, title, startedAt } = row.workout;

    spellings.push({ text: row.name.trim(), at: startedAt });

    const session = byWorkout.get(id);
    if (session) {
      session.sets.push(...row.sets);
    } else {
      byWorkout.set(id, {
        workoutId: id,
        workoutTitle: title,
        performedAt: startedAt,
        sets: [...row.sets],
        topWeightKg: 0,
        volumeKg: 0,
        totalReps: 0,
      });
    }
  }

  const sessions = [...byWorkout.values()]
    .map((session) => ({
      ...session,
      topWeightKg: session.sets.reduce(
        (max, set) => Math.max(max, set.weightKg),
        0,
      ),
      volumeKg: setsVolumeKg(session.sets),
      totalReps: session.sets.reduce((total, set) => total + set.reps, 0),
    }))
    .sort((a, b) => a.performedAt.getTime() - b.performedAt.getTime());

  return { key, name: pickDisplayName(spellings), sessions };
}
