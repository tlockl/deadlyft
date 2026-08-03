/**
 * The rules about movements that both sides of the wire need to agree on: how
 * a name becomes an identity, how it becomes a URL, and how long a setup note
 * may be.
 *
 * Split out of `lib/exercises.ts` -- which is `server-only`, because it queries
 * -- so the logger can normalise a name in the browser as it's typed. Same
 * reason `lib/photo-constants.ts` sits apart from `lib/photos.ts`.
 */

/**
 * Long enough for a machine's settings and a cue or two, short enough that the
 * note stays something you can read at a glance while sitting on the machine.
 */
export const MAX_NOTE_LENGTH = 500;

/**
 * Exercise names are free text, so "Bench Press", "bench press" and
 * "  Bench Press " all mean the same movement. Everything groups on this key,
 * and the most recent spelling is what gets displayed.
 */
export function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

/** URL segment for a movement, e.g. "Pull-up / Chin-up" → "pull-up%20%2F%20chin-up". */
export function exerciseSlug(name: string): string {
  return encodeURIComponent(exerciseKey(name));
}

/**
 * Next hands dynamic segments over still percent-encoded, so a slug has to be
 * decoded before it can be matched back against a name.
 */
export function decodeExerciseSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    // Malformed escape — someone hand-typed a bare "%". Use it verbatim.
    return slug;
  }
}
