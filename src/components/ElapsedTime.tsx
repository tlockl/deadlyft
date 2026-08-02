"use client";

import { useSyncExternalStore } from "react";
import { formatStopwatch } from "@/lib/units";

// The wall clock is an external system, so it is modelled as a store rather
// than as state pushed from an effect. getSnapshot has to return a cached
// value, hence the module-level `now` that only moves when the timer fires.
let now = Date.now();

function subscribe(onStoreChange: () => void) {
  now = Date.now();
  const timer = setInterval(() => {
    now = Date.now();
    onStoreChange();
  }, 1000);
  return () => clearInterval(timer);
}

function getSnapshot() {
  return now;
}

/** Live stopwatch for an in-progress workout. */
export default function ElapsedTime({ startedAt }: { startedAt: number }) {
  // The server has no idea what time it is on the phone, so it renders zero
  // elapsed and the real count starts once the client subscribes.
  const tick = useSyncExternalStore(subscribe, getSnapshot, () => startedAt);

  return <span className="tabular">{formatStopwatch(tick - startedAt)}</span>;
}
