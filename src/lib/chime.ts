"use client";

/**
 * The "your countdown just ran out" signal.
 *
 * A countdown you have to watch is not much of a countdown -- the phone is
 * usually face down on the treadmill tray when it matters -- so this makes a
 * noise instead of only changing colour.
 *
 * Every part of it is best-effort and silently optional. Browsers disagree
 * about all of this, and a missing beep must never take the timer down with it.
 */

// iOS will not start audio outside a user gesture, and it throttles how many
// contexts a page may create, so there is exactly one and it is opened on the
// tap that starts a timer -- see `unlockChime`.
let context: AudioContext | null = null;

type MaybeWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };

/**
 * Opens the audio context. Must be called synchronously from a user gesture,
 * or iOS leaves it suspended and the chime never sounds.
 */
export function unlockChime(): void {
  try {
    const Ctor = window.AudioContext ?? (window as MaybeWebkit).webkitAudioContext;
    if (!Ctor) return;

    context ??= new Ctor();
    // Backgrounding the tab suspends it again, so this is not just first-run.
    if (context.state === "suspended") void context.resume();
  } catch {
    context = null;
  }
}

/** Two rising blips, then a buzz on phones that have a motor. */
export function chime(): void {
  try {
    navigator.vibrate?.([120, 80, 120]);
  } catch {
    // Not supported on iOS at all; nothing to fall back to.
  }

  const ctx = context;
  if (!ctx || ctx.state !== "running") return;

  try {
    [880, 1174.7].forEach((frequency, index) => {
      const startAt = ctx.currentTime + index * 0.18;
      const endAt = startAt + 0.16;

      const oscillator = ctx.createOscillator();
      oscillator.frequency.value = frequency;

      // Ramped rather than switched on and off: a square-edged gain envelope
      // clicks audibly at both ends.
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.25, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(endAt + 0.02);
    });
  } catch {
    // Context died underneath us (tab suspended, output device pulled).
  }
}
