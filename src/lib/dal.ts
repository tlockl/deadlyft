import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decrypt, SESSION_COOKIE } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * The single place that turns a request into a trusted user id.
 *
 * `proxy.ts` also redirects unauthenticated traffic, but that check is
 * optimistic (cookie-only, no database). Every page and every server action
 * calls in here as well, so a request that somehow skips the proxy still can't
 * read or write another user's data.
 */
export const verifySession = cache(async (): Promise<{ userId: string }> => {
  const userId = await getSessionUserId();

  if (!userId) {
    redirect("/login");
  }

  return { userId };
});

/**
 * The signed-in user's id, or null. Unlike `verifySession` this never
 * redirects, which is what route handlers want — an <img> request should get a
 * status code back, not a login page.
 */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return (await decrypt(token))?.userId ?? null;
});

export const getCurrentUser = cache(async () => {
  const { userId } = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    // Never select passwordHash -- this object is passed into components.
    // `photo` pulls only the timestamp, never the bytes: it exists to tell us
    // whether there is a photo and to version its URL.
    select: {
      id: true,
      name: true,
      email: true,
      unit: true,
      createdAt: true,
      photo: { select: { updatedAt: true } },
    },
  });

  if (!user) {
    // Valid cookie for a user that no longer exists (e.g. a reset database).
    redirect("/login");
  }

  return user;
});
