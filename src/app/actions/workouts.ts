"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession, getCurrentUser } from "@/lib/dal";
import { toKg } from "@/lib/units";

export type ActionError = { error: string } | undefined;

/**
 * Begins a workout. The start time is whatever the server clock says right
 * now -- the client never gets to pick it.
 *
 * If a workout is already in progress we reopen that one rather than leaving a
 * trail of abandoned empties behind.
 */
export async function startWorkout(): Promise<never> {
  const { userId } = await verifySession();

  const inProgress = await prisma.workout.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  const workout =
    inProgress ??
    (await prisma.workout.create({
      data: { userId },
      select: { id: true },
    }));

  redirect(`/log/${workout.id}`);
}

const FinishSchema = z.object({
  workoutId: z.string().min(1),
  title: z.string().trim().max(60).optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        sets: z
          .array(
            z.object({
              reps: z.number().int().min(1).max(1000),
              // In the user's own display unit; converted to kg below.
              weight: z.number().min(0).max(5000),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export async function finishWorkout(input: unknown): Promise<ActionError> {
  const user = await getCurrentUser();

  const parsed = FinishSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Some of those sets didn't look right. Check and retry." };
  }
  const { workoutId, title, exercises } = parsed.data;

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { userId: true, status: true },
  });

  if (!workout || workout.userId !== user.id) {
    return { error: "That workout no longer exists." };
  }
  if (workout.status === "COMPLETED") {
    return { error: "That workout was already finished." };
  }

  await prisma.workout.update({
    where: { id: workoutId },
    data: {
      title: title?.length ? title : null,
      status: "COMPLETED",
      finishedAt: new Date(),
      exercises: {
        // The logger sends the whole workout each save, so replace wholesale.
        deleteMany: {},
        create: exercises.map((exercise, exerciseIndex) => ({
          name: exercise.name,
          position: exerciseIndex,
          sets: {
            create: exercise.sets.map((set, setIndex) => ({
              position: setIndex,
              reps: set.reps,
              weightKg: toKg(set.weight, user.unit),
            })),
          },
        })),
      },
    },
  });

  redirect(`/workout/${workoutId}`);
}

/** Throws away an in-progress workout. */
export async function discardWorkout(workoutId: string): Promise<ActionError> {
  const { userId } = await verifySession();

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { userId: true },
  });

  if (!workout || workout.userId !== userId) {
    return { error: "That workout no longer exists." };
  }

  await prisma.workout.delete({ where: { id: workoutId } });

  redirect("/");
}

/** Deletes a finished workout from history. */
export async function deleteWorkout(workoutId: string): Promise<ActionError> {
  const { userId } = await verifySession();

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { userId: true },
  });

  if (!workout || workout.userId !== userId) {
    return { error: "That workout no longer exists." };
  }

  await prisma.workout.delete({ where: { id: workoutId } });

  redirect("/history");
}
