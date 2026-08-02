import "server-only";

export { MAX_UPLOAD_BYTES, TARGET_SIZE } from "@/lib/photo-constants";

const SIGNATURES = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
] as const;

function startsWith(data: Uint8Array, bytes: readonly number[]): boolean {
  return bytes.every((byte, index) => data[index] === byte);
}

/**
 * Identify an image from its leading bytes, ignoring whatever the browser
 * claimed the type was.
 *
 * This is an allowlist on purpose. It matters because these bytes get served
 * back from our own origin: SVG is an XML document that can carry script, so
 * an SVG uploaded as "avatar.jpg" would be stored XSS if we trusted the
 * declared type. SVG has no binary signature and so can never match here.
 */
export function detectImageType(data: Uint8Array): string | null {
  for (const signature of SIGNATURES) {
    if (startsWith(data, signature.bytes)) return signature.mime;
  }

  // WebP is RIFF....WEBP — the marker sits at offset 8, not 0.
  const isRiff = startsWith(data, [0x52, 0x49, 0x46, 0x46]);
  const isWebp = [0x57, 0x45, 0x42, 0x50].every(
    (byte, index) => data[8 + index] === byte,
  );
  if (isRiff && isWebp) return "image/webp";

  return null;
}

/**
 * Whether `viewerId` may see `ownerId`'s photo.
 *
 * Today that means "only your own". This is the single seam where friends will
 * plug in: when there is a friendship table, this becomes
 * `viewerId === ownerId || await areFriends(viewerId, ownerId)` and every
 * caller (the route handler, any future friends list) inherits it.
 */
export function canViewPhoto(viewerId: string, ownerId: string): boolean {
  return viewerId === ownerId;
}

/**
 * Versioned URL for a user's photo, or null if they haven't set one.
 *
 * The `v` parameter changes whenever the photo does, so a replacement shows up
 * immediately instead of sitting behind a stale cache entry. The route also
 * revalidates on every use — see the caching note there for why it can't just
 * serve these URLs as immutable.
 */
export function photoUrl(
  userId: string,
  photo: { updatedAt: Date } | null | undefined,
): string | null {
  if (!photo) return null;
  return `/api/users/${userId}/photo?v=${photo.updatedAt.getTime()}`;
}
