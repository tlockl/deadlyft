import { getSessionUserId } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { canViewPhoto } from "@/lib/photos";

/**
 * Serves a user's profile photo.
 *
 * Everything that isn't "here is your image" answers 404 rather than 401/403:
 * a different status would confirm that a given user id exists and has a photo,
 * which is exactly what an unauthorised caller is fishing for.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ownerId } = await params;
  const viewerId = await getSessionUserId();

  if (!viewerId || !canViewPhoto(viewerId, ownerId)) {
    return new Response(null, { status: 404 });
  }

  const photo = await prisma.profilePhoto.findUnique({
    where: { userId: ownerId },
    select: { data: true, mimeType: true, byteSize: true, updatedAt: true },
  });

  if (!photo) {
    return new Response(null, { status: 404 });
  }

  /*
   * Caching policy, and why it is not `max-age`:
   *
   * `private` only bars *shared* caches; it expressly allows the browser's own.
   * With a long max-age the bytes outlive the session, so on a shared phone the
   * next person to sign in could still load the previous user's photo straight
   * from disk. `no-cache` still lets the browser keep a copy, but forces a
   * revalidation round trip, which re-runs the authorization check above.
   * Unchanged photos come back as a 304 with no body, so this stays cheap.
   */
  const etag = `"${photo.updatedAt.getTime()}-${photo.byteSize}"`;
  const headers = {
    "Content-Type": photo.mimeType,
    "Cache-Control": "private, no-cache, must-revalidate",
    ETag: etag,
    // The bytes were signature-checked on the way in; this stops a browser
    // second-guessing the type on the way out.
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(photo.data, {
    headers: { ...headers, "Content-Length": String(photo.byteSize) },
  });
}
