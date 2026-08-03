"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { exerciseKey, MAX_NOTE_LENGTH } from "@/lib/movements";

const NoteSchema = z.object({
  // The movement's name as typed. Normalised to a key here rather than by the
  // caller, so a note saved from the logger and one saved from the exercise
  // page can never end up under two different keys for the same movement.
  name: z.string().trim().min(1).max(80),
  body: z.string().trim().max(MAX_NOTE_LENGTH),
});

export type NoteState = { ok?: true; error?: string } | undefined;

/**
 * Saves what you need to remember about a movement -- seat height, pin, grip.
 *
 * An empty note deletes the row rather than storing a blank one, so "no note"
 * has exactly one representation and the UI never has to tell the two apart.
 */
export async function saveMovementNote(
  name: string,
  body: string,
): Promise<NoteState> {
  const { userId } = await verifySession();

  const parsed = NoteSchema.safeParse({ name, body });
  if (!parsed.success) {
    return {
      error:
        body.length > MAX_NOTE_LENGTH
          ? `Keep it under ${MAX_NOTE_LENGTH} characters.`
          : "That note couldn't be saved.",
    };
  }

  const key = exerciseKey(parsed.data.name);
  const note = parsed.data.body;

  if (note === "") {
    // deleteMany, not delete: clearing a note that was never there is a no-op,
    // not an error.
    await prisma.movementNote.deleteMany({ where: { userId, key } });
  } else {
    await prisma.movementNote.upsert({
      where: { userId_key: { userId, key } },
      create: { userId, key, body: note },
      update: { body: note },
    });
  }

  // The exercise detail page shows the same note. No redirect here, so there's
  // no navigation for the revalidation to fight with.
  revalidatePath("/exercises", "layout");

  return { ok: true };
}
