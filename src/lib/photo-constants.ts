/**
 * Shared by the browser picker and the server validator, so this file must stay
 * free of `server-only` imports — a Client Component pulls TARGET_SIZE from here.
 */

/**
 * Upload ceiling for the raw file. The browser normally shrinks a photo to a
 * square JPEG before it ever gets sent, so this only really bites when
 * JavaScript didn't run and the original camera file was posted as-is. Keep it
 * under `serverActions.bodySizeLimit` in next.config.ts.
 */
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

/** Edge length we store, in pixels — what the browser downscales to. */
export const TARGET_SIZE = 512;
