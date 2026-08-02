import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Lifetime and trailing-week totals for a user.
 *
 * The sums are done in JS over a narrow projection rather than in SQL: a
 * personal training log is a few thousand rows at most, and this keeps the
 * volume rule in one place (see lib/volume.ts) instead of duplicating it in
 * raw SQL.
 */
export async function getUserStats(userId: string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [sets, workoutCount, weekSets] = await Promise.all([
    prisma.workoutSet.findMany({
      where: {
        exercise: { workout: { userId, status: "COMPLETED" } },
      },
      select: { reps: true, weightKg: true },
    }),
    prisma.workout.count({ where: { userId, status: "COMPLETED" } }),
    prisma.workoutSet.findMany({
      where: {
        exercise: {
          workout: {
            userId,
            status: "COMPLETED",
            startedAt: { gte: weekAgo },
          },
        },
      },
      select: { reps: true, weightKg: true },
    }),
  ]);

  const sum = (rows: { reps: number; weightKg: number }[]) =>
    rows.reduce((total, row) => total + row.reps * row.weightKg, 0);

  return {
    lifetimeVolumeKg: sum(sets),
    lifetimeSets: sets.length,
    workoutCount,
    weekVolumeKg: sum(weekSets),
  };
}
