import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import {
  exerciseKey,
  decodeExerciseSlug,
  getExerciseHistory,
} from "@/lib/exercises";
import {
  fromKg,
  unitLabel,
  formatWeight,
  formatVolumeValue,
  formatDayLabel,
  formatShortDate,
} from "@/lib/units";
import { StatTile } from "@/components/ui";
import { ChevronLeftIcon } from "@/components/icons";
import ExerciseProgress from "@/components/ExerciseProgress";
import type { ChartPoint } from "@/components/ProgressChart";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const user = await getCurrentUser();

  // exerciseKey again so a hand-typed /exercises/Bench%20Press also resolves.
  const history = await getExerciseHistory(
    user.id,
    exerciseKey(decodeExerciseSlug(name)),
  );
  if (!history) {
    notFound();
  }

  const { sessions } = history;

  const bestWeightKg = Math.max(...sessions.map((s) => s.topWeightKg));
  const totalVolumeKg = sessions.reduce((sum, s) => sum + s.volumeKg, 0);

  // Both series are built server-side, already converted to the user's unit and
  // with dates pre-formatted, so the chart itself stays presentational.
  const toPoints = (pick: (session: (typeof sessions)[number]) => number) =>
    sessions.map<ChartPoint>((session) => ({
      ms: session.performedAt.getTime(),
      value: fromKg(pick(session), user.unit),
      shortDate: formatShortDate(session.performedAt),
      fullDate: formatDayLabel(session.performedAt),
    }));

  return (
    <div>
      <div className="px-4 pt-3">
        <Link
          href="/exercises"
          className="-ml-1 inline-flex items-center text-[17px] text-accent"
        >
          <ChevronLeftIcon className="h-[19px] w-[19px]" />
          Exercises
        </Link>
        <h1 className="mt-2 text-[34px] leading-[41px] font-bold tracking-[-0.4px]">
          {history.name}
        </h1>
        <p className="mt-1 text-[15px] text-label2">
          {sessions.length} session{sessions.length === 1 ? "" : "s"} logged
        </p>
      </div>

      <div className="mt-4 px-4">
        <ExerciseProgress
          weightPoints={toPoints((session) => session.topWeightKg)}
          volumePoints={toPoints((session) => session.volumeKg)}
          unit={unitLabel(user.unit)}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        <StatTile
          label="Best"
          value={formatVolumeValue(bestWeightKg, user.unit)}
          unit={unitLabel(user.unit)}
        />
        <StatTile label="Sessions" value={String(sessions.length)} />
        <StatTile
          label="Volume"
          value={formatVolumeValue(totalVolumeKg, user.unit)}
          unit={unitLabel(user.unit)}
        />
      </div>

      <h2 className="px-4 pt-5 pb-2 text-[13px] tracking-[0.5px] text-label2 uppercase">
        Every session
      </h2>

      <div className="flex flex-col gap-2 px-4">
        {[...sessions].reverse().map((session) => (
          <Link
            key={session.workoutId}
            href={`/workout/${session.workoutId}`}
            className="ios-press block rounded-[10px] bg-surface px-4 py-3"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-[15px] font-medium">
                {session.workoutTitle ?? formatDayLabel(session.performedAt)}
              </span>
              <span className="shrink-0 text-[13px] tabular text-label2">
                {formatWeight(session.topWeightKg, user.unit)} top
              </span>
            </div>
            <p className="mt-0.5 text-[13px] text-label2">
              {formatDayLabel(session.performedAt)} · {session.sets.length} set
              {session.sets.length === 1 ? "" : "s"} · {session.totalReps} reps
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {session.sets.map((set, index) => (
                <span
                  key={index}
                  className="rounded-[6px] bg-fill px-2 py-1 text-[13px] tabular"
                >
                  {Math.round(fromKg(set.weightKg, user.unit) * 10) / 10} ×{" "}
                  {set.reps}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
