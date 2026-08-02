import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = process.env.SESSION_SECRET;
if (!secret) {
  throw new Error(
    "SESSION_SECRET is not set. Add it to .env (see .env.example).",
  );
}
const encodedKey = new TextEncoder().encode(secret);

export const SESSION_COOKIE = "session";
const SESSION_DAYS = 30;

export type SessionPayload = { userId: string };

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(encodedKey);
}

export async function decrypt(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodedKey, {
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
