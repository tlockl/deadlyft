"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { BodyMetricKind } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { verifySession, getCurrentUser } from "@/lib/dal";
import {
  BODY_METRICS,
  toCanonical,
  feetInchesToCm,
  todayKey,
} from "@/lib/body";

/**
 * Outcomes come back as a redirect code rather than through `useActionState`,
 * the same as the photo actions: the log form is three number boxes and a
 * date, it needs no client state, so it stays a plain <form> in a Server
 * Component and works on a page that hasn't hydrated.
 */
export type BodyResult =
  | "saved"
  | "empty"
  | "weight"
  | "height"
  | "fat"
  | "date"
  | "future"
  | "gone";

function finish(result: BodyResult): never {
  redirect(`/body?log=${result}`);
}

/** A blank box means "not measured today", not zero. */
function readNumber(formData: FormData, name: string): number | undefined {
  const raw = formData.get(name);
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  return Number(raw);
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Turns the date picker's "YYYY-MM-DD" into an instant.
 *
 * Built from the components rather than with `new Date(string)`, which reads a
 * bare date as UTC midnight -- anywhere west of Greenwich that lands on the
 * previous day in local time, so this morning's weigh-in would plot as
 * yesterday. Today keeps the live clock so two weigh-ins on one day stay in
 * the order they were entered; an earlier day is pinned to local noon, far
 * enough from both midnights that a daylight-saving shift can't move it.
 */
function resolveRecordedAt(input: string): Date | "date" | "future" {
  const match = DATE_PATTERN.exec(input);
  if (!match) return "date";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day, 12);
  // Rejects the likes of 2026-02-30, which JavaScript would roll into March.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "date";
  }

  const now = new Date();
  const today = todayKey(now);
  if (input > today) return "future";

  return input === today ? now : date;
}

/**
 * Records any combination of weight, height and body fat. Each one becomes its
 * own row, so leaving a box blank logs nothing for that metric rather than
 * repeating the last value -- which is what makes height, entered once and
 * then left alone, sit in the same table as a daily weigh-in.
 */
export async function logBodyMetrics(formData: FormData): Promise<void> {
  const user = await getCurrentUser();

  const recordedOn = formData.get("recordedOn");
  const recordedAt = resolveRecordedAt(
    typeof recordedOn === "string" && recordedOn !== ""
      ? recordedOn
      : todayKey(),
  );
  if (recordedAt === "date" || recordedAt === "future") {
    finish(recordedAt);
  }

  const readings: { kind: BodyMetricKind; value: number }[] = [];

  const weight = readNumber(formData, "weight");
  if (weight !== undefined) {
    readings.push({ kind: "WEIGHT", value: toCanonical("WEIGHT", weight, user.unit) });
  }

  // Imperial height arrives as two boxes; either alone is enough, and a blank
  // inches box next to "6" means six feet exactly.
  const feet = readNumber(formData, "heightFeet");
  const inches = readNumber(formData, "heightInches");
  const height = readNumber(formData, "height");
  if (user.unit === "LB") {
    if (feet !== undefined || inches !== undefined) {
      readings.push({
        kind: "HEIGHT",
        value: feetInchesToCm(feet ?? 0, inches ?? 0),
      });
    }
  } else if (height !== undefined) {
    readings.push({ kind: "HEIGHT", value: toCanonical("HEIGHT", height, user.unit) });
  }

  const bodyFat = readNumber(formData, "bodyFat");
  if (bodyFat !== undefined) {
    readings.push({ kind: "BODY_FAT", value: bodyFat });
  }

  if (readings.length === 0) {
    finish("empty");
  }

  // Bounds are checked in canonical units, so the same rule covers a user in
  // pounds and a user in kilograms.
  const ERROR_FOR: Record<BodyMetricKind, BodyResult> = {
    WEIGHT: "weight",
    HEIGHT: "height",
    BODY_FAT: "fat",
  };
  for (const reading of readings) {
    const { min, max } = BODY_METRICS[reading.kind];
    if (!Number.isFinite(reading.value) || reading.value < min || reading.value > max) {
      finish(ERROR_FOR[reading.kind]);
    }
  }

  await prisma.bodyMetric.createMany({
    data: readings.map((reading) => ({
      userId: user.id,
      kind: reading.kind,
      value: reading.value,
      recordedAt,
    })),
  });

  finish("saved");
}

/**
 * Removes one reading. A mistyped weight would otherwise sit in the chart
 * forever, and there is no edit -- same as a finished workout.
 */
export async function deleteBodyMetric(
  id: string,
): Promise<{ error: string } | undefined> {
  const { userId } = await verifySession();

  const metric = await prisma.bodyMetric.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!metric || metric.userId !== userId) {
    return { error: "That measurement no longer exists." };
  }

  await prisma.bodyMetric.delete({ where: { id } });

  // No redirect here -- the user stays on /body and the list refreshes under
  // them, so there is no navigation for the revalidation to fight with.
  revalidatePath("/body");
}
