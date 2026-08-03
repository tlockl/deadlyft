"use client";

import { useState } from "react";
import Segmented from "@/components/Segmented";
import ProgressChart, { type ChartPoint } from "@/components/ProgressChart";

export type BodySeries = {
  value: string;
  label: string;
  /** Suffix for the plotted number, which is not always the stored unit. */
  unit: string;
  points: ChartPoint[];
};

/**
 * Switches the chart between weight, height and body fat. Every series is
 * built on the server and sent together, so switching costs no round trip --
 * the same arrangement as the per-exercise chart.
 */
export default function BodyProgress({ series }: { series: BodySeries[] }) {
  // Opens on the first metric that actually has readings, so a user who only
  // ever logs weight never lands on an empty chart.
  const [selected, setSelected] = useState(
    () => (series.find((entry) => entry.points.length > 0) ?? series[0]).value,
  );

  const active = series.find((entry) => entry.value === selected) ?? series[0];

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        ariaLabel="Measurement"
        options={series}
        value={selected}
        onChange={setSelected}
      />
      {active.points.length > 0 ? (
        <ProgressChart
          points={active.points}
          unit={active.unit}
          noun="reading"
          singleHint="Measure again to start seeing a trend."
        />
      ) : (
        <div className="rounded-[10px] bg-surface px-4 py-10 text-center">
          <p className="text-[15px] text-label2">
            No {active.label.toLowerCase()} logged yet.
          </p>
        </div>
      )}
    </div>
  );
}
