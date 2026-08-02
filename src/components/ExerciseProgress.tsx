"use client";

import { useState } from "react";
import Segmented from "@/components/Segmented";
import ProgressChart, { type ChartPoint } from "@/components/ProgressChart";

const METRICS = [
  { value: "weight", label: "Top weight" },
  { value: "volume", label: "Volume" },
] as const;

type Metric = (typeof METRICS)[number]["value"];

/**
 * Both series are computed on the server and switched here, so changing metric
 * is instant and needs no round trip.
 */
export default function ExerciseProgress({
  weightPoints,
  volumePoints,
  unit,
}: {
  weightPoints: ChartPoint[];
  volumePoints: ChartPoint[];
  unit: string;
}) {
  const [metric, setMetric] = useState<Metric>("weight");

  return (
    <div className="flex flex-col gap-3">
      <Segmented
        ariaLabel="Chart metric"
        options={METRICS}
        value={metric}
        onChange={setMetric}
      />
      <ProgressChart
        points={metric === "weight" ? weightPoints : volumePoints}
        unit={unit}
      />
    </div>
  );
}
