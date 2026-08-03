import { Fragment } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { workoutVolumeKg, setsVolumeKg, countSets } from "@/lib/volume";
import { cardioSeconds, hitTarget, type CardioLike } from "@/lib/cardio";
import {
  formatVolume,
  formatVolumeValue,
  formatWeight,
  formatDateTime,
  formatDayLabel,
  formatDuration,
  formatStopwatch,
  unitLabel,
} from "@/lib/units";
import { exerciseSlug } from "@/lib/exercises";
import { StatTile, SectionHeader } from "@/components/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import DeleteWorkoutButton from "@/components/DeleteWorkoutButton";

/** How a finished cardio entry describes the timer that produced it. */
function cardioCaption(entry: CardioLike): string {
  if (entry.targetSec === null) return "Counted up";

  const target = formatStopwatch(entry.targetSec * 1000);
  return hitTarget(entry)
    ? `Counted down from ${target} · finished`
    : `Counted down from ${target} · stopped early`;
}

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const workout = await prisma.workout.findUnique({
    where: { id },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { sets: { orderBy: { position: "asc" } } },
      },
      cardio: { orderBy: { position: "asc" } },
    },
  });

  // Someone else's workout is indistinguishable from one that doesn't exist.
  if (!workout || workout.userId !== user.id) {
    notFound();
  }

  // Still in progress: send them to the logger instead of a read-only view.
  if (workout.status === "ACTIVE") {
    redirect(`/log/${workout.id}`);
  }

  const volumeKg = workoutVolumeKg(workout.exercises);
  const duration = workout.finishedAt
    ? workout.finishedAt.getTime() - workout.startedAt.getTime()
    : null;

  return (
    <div>
      <div className="px-4 pt-3">
        <Link
          href="/history"
          className="-ml-1 inline-flex items-center text-[17px] text-accent"
        >
          <ChevronLeftIcon className="h-[19px] w-[19px]" />
          History
        </Link>
        <h1 className="mt-2 text-[34px] leading-[41px] font-bold tracking-[-0.4px]">
          {workout.title ?? formatDayLabel(workout.startedAt)}
        </h1>
        <p className="mt-1 text-[15px] text-label2">
          {formatDateTime(workout.startedAt)}
          {duration !== null && ` · ${formatDuration(duration)}`}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 px-4">
        <StatTile
          label="Volume"
          value={formatVolumeValue(volumeKg, user.unit)}
          unit={unitLabel(user.unit)}
        />
        <StatTile label="Sets" value={String(countSets(workout.exercises))} />
        {/* The exercise count is the least interesting of the three, so cardio
            takes its slot whenever there is any -- which is also the case where
            a bare "Exercises 0" would read worst. */}
        {workout.cardio.length > 0 ? (
          <StatTile
            label="Cardio"
            value={formatStopwatch(cardioSeconds(workout.cardio) * 1000)}
          />
        ) : (
          <StatTile label="Exercises" value={String(workout.exercises.length)} />
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 px-4">
        {workout.exercises.map((exercise) => (
          <section
            key={exercise.id}
            className="overflow-hidden rounded-[10px] bg-surface"
          >
            {/* Tapping the name jumps to this movement's progress over time. */}
            <Link
              href={`/exercises/${exerciseSlug(exercise.name)}`}
              className="ios-press flex items-center justify-between gap-3 px-4 pt-3 pb-2"
            >
              <h2 className="flex min-w-0 items-center gap-1 text-[17px] font-semibold">
                <span className="truncate">{exercise.name}</span>
                <ChevronRightIcon className="h-[13px] w-[13px] shrink-0 text-label3" />
              </h2>
              <span className="shrink-0 text-[13px] tabular text-label2">
                {formatVolume(setsVolumeKg(exercise.sets), user.unit)}
              </span>
            </Link>

            <div className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-y-1 px-4 pb-3">
              <span className="text-[13px] text-label2">Set</span>
              <span className="text-right text-[13px] text-label2">
                Weight
              </span>
              <span className="text-right text-[13px] text-label2">Reps</span>

              {exercise.sets.map((set, index) => (
                <Fragment key={set.id}>
                  <span className="py-[5px] text-[15px] tabular text-label2">
                    {index + 1}
                  </span>
                  <span className="py-[5px] text-right text-[17px] tabular">
                    {formatWeight(set.weightKg, user.unit)}
                  </span>
                  <span className="py-[5px] text-right text-[17px] tabular">
                    {set.reps}
                  </span>
                </Fragment>
              ))}
            </div>
          </section>
        ))}
      </div>

      {workout.cardio.length > 0 && (
        <>
          <SectionHeader>Cardio</SectionHeader>
          <div className="flex flex-col gap-3 px-4">
            {workout.cardio.map((entry) => (
              <section
                key={entry.id}
                className="rounded-[10px] bg-surface px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="min-w-0 truncate text-[17px] font-semibold">
                    {entry.name}
                  </h2>
                  <span className="shrink-0 text-[17px] tabular">
                    {formatStopwatch(entry.durationSec * 1000)}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-label2">
                  {cardioCaption(entry)}
                </p>
              </section>
            ))}
          </div>
        </>
      )}

      <div className="mt-6">
        <DeleteWorkoutButton workoutId={workout.id} />
      </div>
    </div>
  );
}
