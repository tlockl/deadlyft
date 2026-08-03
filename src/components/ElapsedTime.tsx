"use client";

import { useNow } from "@/lib/clock";
import { formatStopwatch } from "@/lib/units";

/** Live stopwatch for an in-progress workout. */
export default function ElapsedTime({ startedAt }: { startedAt: number }) {
  // Rendering `startedAt` as "now" on the server means the first paint reads
  // 0:00 everywhere, and the real count starts once the client subscribes.
  const now = useNow(startedAt);

  return <span className="tabular">{formatStopwatch(now - startedAt)}</span>;
}
