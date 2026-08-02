import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/dal";
import { getExerciseSummaries, exerciseSlug } from "@/lib/exercises";
import { formatWeight, formatDayLabel } from "@/lib/units";
import {
  LargeTitle,
  SectionHeader,
  InsetGroup,
  LinkRow,
  EmptyState,
} from "@/components/ui";
import { DumbbellIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Exercises · Reps" };

export default async function ExercisesPage() {
  const user = await getCurrentUser();
  const exercises = await getExerciseSummaries(user.id);

  return (
    <div>
      <LargeTitle title="Exercises" />

      {exercises.length === 0 ? (
        <InsetGroup className="mt-4">
          <EmptyState
            icon={<DumbbellIcon className="h-10 w-10" />}
            title="No movements yet"
            body="Every exercise you log shows up here with a chart of how it's progressing."
          />
        </InsetGroup>
      ) : (
        <>
          <SectionHeader>
            {exercises.length} movement{exercises.length === 1 ? "" : "s"}
          </SectionHeader>
          <InsetGroup>
            {exercises.map((exercise, index) => (
              <LinkRow
                key={exercise.key}
                href={`/exercises/${exerciseSlug(exercise.name)}`}
                last={index === exercises.length - 1}
                title={exercise.name}
                subtitle={`${exercise.sessionCount} session${
                  exercise.sessionCount === 1 ? "" : "s"
                } · ${formatDayLabel(exercise.lastPerformed)}`}
                trailing={formatWeight(exercise.bestWeightKg, user.unit)}
              />
            ))}
          </InsetGroup>
        </>
      )}
    </div>
  );
}
