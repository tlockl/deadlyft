"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { detectImageType } from "@/lib/photos";
import { MAX_UPLOAD_BYTES } from "@/lib/photo-constants";

/**
 * Outcomes are reported by redirecting back to /profile with a code, rather
 * than returned through `useActionState`. That keeps the <form> itself in a
 * Server Component, so choosing a photo and saving it still works on a page
 * that hasn't hydrated -- and the result still renders either way.
 */
export type PhotoResult = "saved" | "removed" | "empty" | "large" | "type";

function finish(result: PhotoResult): never {
  redirect(`/profile?photo=${result}`);
}

export async function uploadPhoto(formData: FormData): Promise<void> {
  const { userId } = await verifySession();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    finish("empty");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    finish("large");
  }

  const data = new Uint8Array(await file.arrayBuffer());

  // Trust the bytes, not the content type the browser claimed.
  const mimeType = detectImageType(data);
  if (!mimeType) {
    finish("type");
  }

  await prisma.profilePhoto.upsert({
    where: { userId },
    create: { userId, data, mimeType, byteSize: data.byteLength },
    update: { data, mimeType, byteSize: data.byteLength },
  });

  // The avatar shows outside this page too, so refresh the whole tree.
  revalidatePath("/", "layout");
  finish("saved");
}

export async function removePhoto(): Promise<void> {
  const { userId } = await verifySession();

  // deleteMany, not delete: removing a photo that isn't there is a no-op,
  // not an error.
  await prisma.profilePhoto.deleteMany({ where: { userId } });

  revalidatePath("/", "layout");
  finish("removed");
}
