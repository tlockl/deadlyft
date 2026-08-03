"use client";

import { useSyncExternalStore } from "react";

// The wall clock is an external system, so it is modelled as a store rather
// than as state pushed from an effect. getSnapshot has to return a cached
// value, hence the module-level `now` that only moves when the timer fires.
//
// One store serves every live readout on the screen, so the workout stopwatch
// and any number of cardio timers all advance on the same tick instead of
// each running an interval that drifts against the others.
let now = Date.now();

// Faster than the one-second granularity anything here displays, so a readout
// changes within a frame or two of the second it belongs to rather than up to
// a full second late. Everything formats down to whole seconds, so the extra
// renders in between produce identical output.
const TICK_MS = 250;

function subscribe(onStoreChange: () => void) {
  const tick = () => {
    now = Date.now();
    onStoreChange();
  };

  now = Date.now();
  const timer = setInterval(tick, TICK_MS);

  // A hidden tab has its timers throttled hard -- a locked phone stops firing
  // them almost entirely -- so every readout on the page is stale by however
  // long the user was away. Nothing is *lost*, because all of them are computed
  // from timestamps rather than accumulated per tick, but without this the
  // correct value only appears whenever the throttled interval next gets
  // around to firing. Ticking on the way back makes it already right by the
  // time the screen is looked at.
  document.addEventListener("visibilitychange", tick);

  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
  };
}

function getSnapshot() {
  return now;
}

/**
 * The current time, re-rendering the caller as it advances.
 *
 * The server has no idea what time it is on the phone, so `serverValue` is what
 * both the server render and the hydration pass see; the real clock takes over
 * once the subscription is live. Pass the value that makes the component render
 * a standing-still readout -- usually the instant it is measuring from.
 */
export function useNow(serverValue: number): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}
