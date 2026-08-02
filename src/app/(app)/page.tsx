import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getUserStats } from "@/lib/stats";
import { workoutVolumeKg, countSets } from "@/lib/volume";
import {
  formatVolume,
  formatVolumeValue,
  unitLabel,
  formatDayLabel,
  formatTime,
  formatDuration,
} from "@/lib/units";
import {
  LargeTitle,
  SectionHeader,
  InsetGroup,
  LinkRow,
  StatTile,
  EmptyState,
} from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import Avatar from "@/components/Avatar";
import { photoUrl } from "@/lib/photos";
import { startWorkout } from "@/app/actions/workouts";
import { DumbbellIcon } from "@/components/icons";

export default async function HomePage() {
  const user = await getCurrentUser();

  const [activeWorkout, recent, stats] = await Promise.all([
    prisma.workout.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
      select: { id: true, startedAt: true },
    }),
    prisma.workout.findMany({
      where: { userId: user.id, status: "COMPLETED" },
      orderBy: { startedAt: "desc" },
      take: 3,
      include: { exercises: { include: { sets: true } } },
    }),
    getUserStats(user.id),
  ]);

  return (
    <div>
      <LargeTitle
        title={`Hey, ${user.name.split(" ")[0]}`}
        subtitle={formatDayLabel(new Date())}
        action={
          <Link href="/profile" aria-label="Profile">
            <Avatar
              name={user.name}
              src={photoUrl(user.id, user.photo)}
              size={44}
            />
          </Link>
        }
      />

      <div className="px-4 pt-2">
        {activeWorkout ? (
          <Link
            href={`/log/${activeWorkout.id}`}
            className="ios-tap flex items-center justify-between rounded-[12px] bg-accent px-4 py-3 text-white"
          >
            <span>
              <span className="block text-[13px] font-medium opacity-80">
                Workout in progress
              </span>
              <span className="block text-[17px] font-semibold">
                Started {formatTime(activeWorkout.startedAt)}
              </span>
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-[15px] font-semibold">
              Resume
            </span>
          </Link>
        ) : (
          // A real form, not an onClick: this still submits if the page hasn't
          // hydrated yet.
          <form action={startWorkout}>
            <SubmitButton pendingLabel="Starting…">Start Workout</SubmitButton>
          </form>
        )}
      </div>

      <SectionHeader>Total weight moved</SectionHeader>
      <div className="mx-4 rounded-[10px] bg-surface px-4 py-4">
        <p className="text-[40px] leading-[46px] font-bold tabular tracking-[-1px]">
          {formatVolumeValue(stats.lifetimeVolumeKg, user.unit)}
          <span className="ml-1.5 text-[20px] font-semibold text-label2">
            {unitLabel(user.unit)}
          </span>
        </p>
        <p className="mt-1 text-[13px] text-label2">
          Across {stats.lifetimeSets} set{stats.lifetimeSets === 1 ? "" : "s"}{" "}
          in {stats.workoutCount} workout
          {stats.workoutCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 px-4">
        <StatTile
          label="Last 7 days"
          value={formatVolumeValue(stats.weekVolumeKg, user.unit)}
          unit={unitLabel(user.unit)}
        />
        <StatTile label="Workouts" value={stats.workoutCount.toLocaleString()} />
      </div>

      <SectionHeader
        trailing={
          recent.length > 0 ? (
            <Link href="/history" className="text-[15px] text-accent">
              See All
            </Link>
          ) : undefined
        }
      >
        Recent
      </SectionHeader>

      {recent.length === 0 ? (
        <InsetGroup>
          <EmptyState
            icon={<DumbbellIcon className="h-10 w-10" />}
            title="No workouts yet"
            body="Tap Start Workout and your first session will show up here."
          />
        </InsetGroup>
      ) : (
        <InsetGroup>
          {recent.map((workout, index) => (
            <LinkRow
              key={workout.id}
              href={`/workout/${workout.id}`}
              last={index === recent.length - 1}
              title={workout.title ?? formatDayLabel(workout.startedAt)}
              subtitle={`${formatTime(workout.startedAt)} · ${countSets(
                workout.exercises,
              )} sets${
                workout.finishedAt
                  ? ` · ${formatDuration(
                      workout.finishedAt.getTime() -
                        workout.startedAt.getTime(),
                    )}`
                  : ""
              }`}
              trailing={formatVolume(
                workoutVolumeKg(workout.exercises),
                user.unit,
              )}
            />
          ))}
        </InsetGroup>
      )}
    </div>
  );
}
