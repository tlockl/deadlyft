/**
 * Cumulative weight moved: every set's reps multiplied by its weight, summed.
 * This is the number the app is really about, so it lives in one place and is
 * always derived from the sets rather than stored alongside them.
 */
export type SetLike = { reps: number; weightKg: number };
export type ExerciseLike = { sets: SetLike[] };

export function setsVolumeKg(sets: SetLike[]): number {
  return sets.reduce((total, set) => total + set.reps * set.weightKg, 0);
}

export function workoutVolumeKg(exercises: ExerciseLike[]): number {
  return exercises.reduce(
    (total, exercise) => total + setsVolumeKg(exercise.sets),
    0,
  );
}

export function countSets(exercises: ExerciseLike[]): number {
  return exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}
