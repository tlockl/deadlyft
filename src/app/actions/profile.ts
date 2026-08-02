"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type ProfileState = { ok?: true; error?: string } | undefined;

const ProfileSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(60),
  unit: z.enum(["LB", "KG"]),
});

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const { userId } = await verifySession();

  const parsed = ProfileSchema.safeParse({
    name: formData.get("name"),
    unit: formData.get("unit"),
  });

  if (!parsed.success) {
    return {
      error:
        z.flattenError(parsed.error).fieldErrors.name?.[0] ??
        "Those settings didn't look right.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  });

  // Weights are stored in kg, so switching units restates every existing
  // workout everywhere it is displayed.
  revalidatePath("/", "layout");

  return { ok: true };
}
