import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Checked on first use, not at module load.
 *
 * `next build` evaluates every route's module graph to collect page data, and
 * it does that in an image build where no secret is set -- so throwing up here
 * fails the build itself, reported as "Failed to collect page data" for
 * whichever route the build workers happened to reach first. Deferring it
 * keeps the guard (nothing can sign a cookie with an absent key) while letting
 * a build run without production secrets, which is what makes it possible to
 * build the image before the environment exists.
 */
let encodedKey: Uint8Array | undefined;

function key(): Uint8Array {
  if (!encodedKey) {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error(
        "SESSION_SECRET is not set. Add it to .env (see .env.example).",
      );
    }
    encodedKey = new TextEncoder().encode(secret);
  }
  return encodedKey;
}

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

export type SessionPayload = { userId: string };

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function decrypt(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
    });
    return typeof payload.userId === "string"
      ? { userId: payload.userId }
      : null;
  } catch {
    // Expired, tampered with, or signed by a different secret.
    return null;
  }
}

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, await encrypt({ userId }), {
    httpOnly: true,
    // `secure` requires HTTPS, which the local dev server doesn't speak, so it
    // is only enforced in production.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
