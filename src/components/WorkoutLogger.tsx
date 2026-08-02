"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { WeightUnit } from "@/generated/prisma/enums";
import { finishWorkout, discardWorkout } from "@/app/actions/workouts";
import { toKg, formatVolume, unitLabel } from "@/lib/units";
import ElapsedTime from "@/components/ElapsedTime";
import { CloseIcon, PlusIcon } from "@/components/icons";

type SetDraft = { id: string; reps: string; weight: string };
type ExerciseDraft = { id: string; name: string; sets: SetDraft[] };

// Ids only ever become React keys, so a plain counter beats randomness here —
// it stays identical between the server render and hydration.
let nextId = 0;
const uid = () => `d${nextId++}`;

const emptySet = (): SetDraft => ({ id: uid(), reps: "", weight: "" });
const emptyExercise = (): ExerciseDraft => ({
  id: uid(),
  name: "",
  sets: [emptySet()],
});

export default function WorkoutLogger({
  workoutId,
  startedAt,
  unit,
}: {
  workoutId: string;
  startedAt: number;
  unit: WeightUnit;
}) {
  const [title, setTitle] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([
    emptyExercise(),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pending, startTransition] = useTransition();

  // Running totals, recomputed as the user types.
  const { volumeKg, setCount } = useMemo(() => {
    let volumeKg = 0;
    let setCount = 0;

    for (const exercise of exercises) {
      for (const set of exercise.sets) {
        const reps = Number.parseInt(set.reps, 10);
        if (!Number.isFinite(reps) || reps <= 0) continue;
        // A blank weight means bodyweight, which adds reps but no volume.
        const weight = Number.parseFloat(set.weight);
        volumeKg += reps * toKg(Number.isFinite(weight) ? weight : 0, unit);
        setCount += 1;
      }
    }

    return { volumeKg, setCount };
  }, [exercises, unit]);

  function patchExercise(id: string, patch: Partial<ExerciseDraft>) {
    setExercises((prev) =>
      prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)),
    );
  }

  function patchSet(exerciseId: string, setId: string, patch: Partial<SetDraft>) {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
            }
          : ex,
      ),
    );
  }

  function handleFinish() {
    setError(null);

    const payload = {
      workoutId,
      title: title.trim() || undefined,
      exercises: exercises
        .map((exercise) => ({
          name: exercise.name.trim(),
          sets: exercise.sets
            .map((set) => {
              const reps = Number.parseInt(set.reps, 10);
              const weight = Number.parseFloat(set.weight);
              return {
                reps,
                weight: Number.isFinite(weight) ? weight : 0,
              };
            })
            .filter((set) => Number.isFinite(set.reps) && set.reps > 0),
        }))
        .filter((exercise) => exercise.name !== "" && exercise.sets.length > 0),
    };

    if (payload.exercises.length === 0) {
      setError(
        "Add at least one named exercise with a set that has reps in it.",
      );
      return;
    }

    startTransition(async () => {
      const result = await finishWorkout(payload);
      if (result?.error) setError(result.error);
    });
  }

  function handleDiscard() {
    if (!confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    startTransition(async () => {
      const result = await discardWorkout(workoutId);
      if (result?.error) {
        setError(result.error);
        setConfirmDiscard(false);
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header
        className="ios-material sticky top-0 z-40 border-b border-separator"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="grid h-[44px] grid-cols-[1fr_auto_1fr] items-center px-4">
          <Link href="/" className="justify-self-start text-[17px] text-accent">
            Close
          </Link>
          <p className="text-[17px] font-semibold">
            <ElapsedTime startedAt={startedAt} />
          </p>
          <span className="justify-self-end text-[15px] tabular text-label2">
            {setCount} {setCount === 1 ? "set" : "sets"}
          </span>
        </div>
      </header>

      <div className="flex-1 pb-4">
        <div className="mx-4 mt-4 rounded-[10px] bg-surface px-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Workout name (optional)"
            maxLength={60}
            className="h-[46px] w-full bg-transparent text-[17px] font-semibold outline-none"
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 px-4">
          {exercises.map((exercise, exerciseIndex) => (
            <section
              key={exercise.id}
              className="overflow-hidden rounded-[10px] bg-surface"
            >
              <div className="flex items-center gap-2 px-4 pt-3">
                <input
                  value={exercise.name}
                  onChange={(event) =>
                    patchExercise(exercise.id, { name: event.target.value })
                  }
                  placeholder={`Exercise ${exerciseIndex + 1}`}
                  maxLength={80}
                  className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none"
                />
                {exercises.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove exercise ${exerciseIndex + 1}`}
                    onClick={() =>
                      setExercises((prev) =>
                        prev.filter((ex) => ex.id !== exercise.id),
                      )
                    }
                    className="shrink-0 p-1 text-label3"
                  >
                    <CloseIcon className="h-[18px] w-[18px]" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-[1.75rem_1fr_1fr_1.75rem] items-center gap-x-2 gap-y-2 px-4 pt-3 pb-3">
                <span className="text-[13px] text-label2">#</span>
                <span className="text-center text-[13px] text-label2">
                  Weight ({unitLabel(unit)})
                </span>
                <span className="text-center text-[13px] text-label2">
                  Reps
                </span>
                <span />

                {exercise.sets.map((set, setIndex) => (
                  <SetRow
                    key={set.id}
                    index={setIndex}
                    set={set}
                    onChange={(patch) => patchSet(exercise.id, set.id, patch)}
                    onRemove={
                      exercise.sets.length > 1
                        ? () =>
                            patchExercise(exercise.id, {
                              sets: exercise.sets.filter(
                                (s) => s.id !== set.id,
                              ),
                            })
                        : undefined
                    }
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  patchExercise(exercise.id, {
                    sets: [...exercise.sets, emptySet()],
                  })
                }
                className="ios-press flex w-full items-center justify-center gap-1 border-t border-separator py-[11px] text-[15px] font-medium text-accent"
              >
                <PlusIcon className="h-4 w-4" />
                Add Set
              </button>
            </section>
          ))}
        </div>

        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={() =>
              setExercises((prev) => [...prev, emptyExercise()])
            }
            className="ios-press flex h-[50px] w-full items-center justify-center gap-1 rounded-[12px] bg-surface text-[17px] font-medium text-accent"
          >
            <PlusIcon className="h-[18px] w-[18px]" />
            Add Exercise
          </button>
        </div>

        <div className="px-4 pt-6">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={pending}
            className="ios-press flex h-[50px] w-full items-center justify-center rounded-[12px] bg-surface text-[17px] font-medium text-danger disabled:opacity-40"
          >
            {confirmDiscard ? "Tap again to discard" : "Discard Workout"}
          </button>
          {confirmDiscard && !pending && (
            <button
              type="button"
              onClick={() => setConfirmDiscard(false)}
              className="mt-2 w-full text-center text-[15px] text-label2"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <footer
        className="ios-material sticky bottom-0 border-t border-separator px-4 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {error && (
          <p className="pb-2 text-[13px] leading-[18px] text-danger">{error}</p>
        )}
        <div className="flex items-baseline justify-between pb-2">
          <span className="text-[13px] text-label2">Total weight moved</span>
          <span className="text-[22px] leading-[26px] font-bold tabular tracking-[-0.4px]">
            {formatVolume(volumeKg, unit)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleFinish}
          disabled={pending}
          className="ios-tap flex h-[50px] w-full items-center justify-center rounded-[12px] bg-accent text-[17px] font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Finish Workout"}
        </button>
      </footer>
    </div>
  );
}

function SetRow({
  index,
  set,
  onChange,
  onRemove,
}: {
  index: number;
  set: SetDraft;
  onChange: (patch: Partial<SetDraft>) => void;
  onRemove?: () => void;
}) {
  const inputClass =
    "h-[36px] w-full rounded-[8px] bg-fill text-center text-[17px] tabular outline-none focus:ring-2 focus:ring-accent";

  return (
    <>
      <span className="text-[15px] tabular text-label2">{index + 1}</span>
      <input
        inputMode="decimal"
        enterKeyHint="next"
        placeholder="0"
        aria-label={`Set ${index + 1} weight`}
        value={set.weight}
        // Digits and a single decimal point; iOS decimal pads vary by locale.
        onChange={(event) =>
          onChange({
            weight: event.target.value.replace(/[^0-9.]/g, "").slice(0, 7),
          })
        }
        className={inputClass}
      />
      <input
        inputMode="numeric"
        enterKeyHint="next"
        placeholder="0"
        aria-label={`Set ${index + 1} reps`}
        value={set.reps}
        onChange={(event) =>
          onChange({ reps: event.target.value.replace(/[^0-9]/g, "").slice(0, 4) })
        }
        className={inputClass}
      />
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove set ${index + 1}`}
          onClick={onRemove}
          className="justify-self-center p-1 text-label3"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      ) : (
        <span />
      )}
    </>
  );
}
