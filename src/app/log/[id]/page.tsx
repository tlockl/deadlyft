import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import WorkoutLogger from "@/components/WorkoutLogger";

export const metadata: Metadata = { title: "Logging · Reps" };

/**
 * The active-workout screen. It lives outside the (app) route group so it can
 * cover the tab bar, the way a full-screen modal does on iOS.
 */
export default async function LogWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const workout = await prisma.workout.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, startedAt: true },
  });

  if (!workout || workout.userId !== user.id) {
    notFound();
  }

  // Already finished: nothing left to log, so show the saved version.
  if (workout.status === "COMPLETED") {
    redirect(`/workout/${workout.id}`);
  }

  return (
    <WorkoutLogger
      workoutId={workout.id}
      startedAt={workout.startedAt.getTime()}
      unit={user.unit}
    />
  );
}
