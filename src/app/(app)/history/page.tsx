import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { workoutVolumeKg, countSets } from "@/lib/volume";
import {
  formatVolume,
  formatDayLabel,
  formatTime,
  formatDuration,
} from "@/lib/units";
import {
  LargeTitle,
  SectionHeader,
  InsetGroup,
  LinkRow,
  EmptyState,
} from "@/components/ui";
import { HistoryIcon } from "@/components/icons";

export const metadata: Metadata = { title: "History · Reps" };

/** Group workouts under a month heading, newest first. */
function monthKey(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function HistoryPage() {
  const user = await getCurrentUser();

  const workouts = await prisma.workout.findMany({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { startedAt: "desc" },
    include: { exercises: { include: { sets: true } } },
  });

  const months = workouts.reduce<
    { label: string; workouts: typeof workouts }[]
  >((groups, workout) => {
    const label = monthKey(workout.startedAt);
    const current = groups.at(-1);
    if (current?.label === label) {
      current.workouts.push(workout);
    } else {
      groups.push({ label, workouts: [workout] });
    }
    return groups;
  }, []);

  return (
    <div>
      <LargeTitle title="History" />

      {workouts.length === 0 ? (
        <InsetGroup className="mt-4">
          <EmptyState
            icon={<HistoryIcon className="h-10 w-10" />}
            title="Nothing logged yet"
            body="Finished workouts are kept here with the date and time they happened."
          />
        </InsetGroup>
      ) : (
        months.map((month) => (
          <section key={month.label}>
            <SectionHeader>{month.label}</SectionHeader>
            <InsetGroup>
              {month.workouts.map((workout, index) => (
                <LinkRow
                  key={workout.id}
                  href={`/workout/${workout.id}`}
                  last={index === month.workouts.length - 1}
                  title={workout.title ?? formatDayLabel(workout.startedAt)}
                  // Kept short deliberately: this line truncates on a narrow
                  // phone, and the exercise breakdown is on the detail page.
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
          </section>
        ))
      )}
    </div>
  );
}
