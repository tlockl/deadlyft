"use client";

import { useId, useMemo, useState } from "react";

export type ChartPoint = {
  /** Timestamp, used only for horizontal position so gaps read truthfully. */
  ms: number;
  value: number;
  /** Pre-formatted on the server, so the client never re-derives a date string. */
  shortDate: string;
  fullDate: string;
};

// A fixed viewBox scaled to the container: the SVG stays crisp at any width and
// the type scales with it, which is what we want on a phone.
const VB_W = 340;
const VB_H = 200;
const PAD_L = 40;
const PAD_R = 14;
const PAD_T = 16;
const PAD_B = 28;
const PLOT_W = VB_W - PAD_L - PAD_R;
const PLOT_H = VB_H - PAD_T - PAD_B;
const TICKS = 4;

/**
 * The y-axis deliberately does not start at zero. This chart is about change
 * over time, and zeroing the axis would flatten every real difference into a
 * straight line near the top.
 */
function yDomain(values: number[]): [number, number] {
  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.1, 1);
    return [Math.max(0, min - pad), max + pad];
  }

  const pad = (max - min) * 0.15;
  return [Math.max(0, min - pad), max + pad];
}

function formatTick(value: number, range: number): string {
  const rounded = range < 10 ? Math.round(value * 10) / 10 : Math.round(value);
  return rounded.toLocaleString("en-US");
}

export default function ProgressChart({
  points,
  unit,
  noun = "session",
  singleHint = "Log this movement again to start seeing a trend.",
}: {
  points: ChartPoint[];
  unit: string;
  /** What one point stands for, in the caption and the accessible label. */
  noun?: string;
  /** Caption for a lone point, where there is no trend to read yet. */
  singleHint?: string;
}) {
  const gradientId = useId();
  // Opens on the most recent session, which is the one you care about most.
  const [selected, setSelected] = useState(points.length - 1);

  const geometry = useMemo(() => {
    const values = points.map((point) => point.value);
    const [minY, maxY] = yDomain(values);
    const spanY = maxY - minY || 1;

    const minMs = points[0]?.ms ?? 0;
    const maxMs = points.at(-1)?.ms ?? 0;
    const spanMs = maxMs - minMs;

    const x = (ms: number) =>
      // A single session (or several on one day) sits in the middle.
      spanMs === 0 ? PAD_L + PLOT_W / 2 : PAD_L + ((ms - minMs) / spanMs) * PLOT_W;
    const y = (value: number) =>
      PAD_T + (1 - (value - minY) / spanY) * PLOT_H;

    const coords = points.map((point) => ({
      cx: x(point.ms),
      cy: y(point.value),
    }));

    const ticks = Array.from({ length: TICKS }, (_, index) => {
      const value = minY + (spanY * index) / (TICKS - 1);
      return { value, cy: y(value) };
    });

    return { coords, ticks, range: maxY - minY };
  }, [points]);

  const { coords, ticks, range } = geometry;
  const active = points[selected] ?? points[points.length - 1];
  const activeCoord = coords[selected] ?? coords[coords.length - 1];

  const linePath = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.cx} ${coord.cy}`)
    .join(" ");
  const areaPath =
    coords.length > 1
      ? `${linePath} L${coords.at(-1)!.cx} ${PAD_T + PLOT_H} L${coords[0].cx} ${
          PAD_T + PLOT_H
        } Z`
      : "";

  const previous = selected > 0 ? points[selected - 1] : null;
  const delta = previous ? active.value - previous.value : null;

  return (
    <div className="overflow-hidden rounded-[10px] bg-surface">
      <div className="px-4 pt-3">
        <p className="text-[28px] leading-[34px] font-bold tabular tracking-[-0.4px]">
          {formatTick(active.value, range)}
          <span className="ml-1 text-[15px] font-semibold text-label2">
            {unit}
          </span>
        </p>
        <p className="mt-0.5 text-[13px] text-label2">
          {active.fullDate}
          {delta !== null && delta !== 0 && (
            <span
              className={delta > 0 ? "text-success" : "text-label2"}
            >{` · ${delta > 0 ? "+" : "−"}${formatTick(
              Math.abs(delta),
              range,
            )} ${unit} vs. previous`}</span>
          )}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="mt-1 h-auto w-full text-accent"
        role="group"
        aria-label={`Line chart of ${points.length} ${noun}s, from ${points[0].shortDate} to ${points.at(-1)!.shortDate}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD_L}
              y1={tick.cy}
              x2={PAD_L + PLOT_W}
              y2={tick.cy}
              stroke="var(--ios-separator)"
              strokeWidth={0.5}
            />
            <text
              x={PAD_L - 6}
              y={tick.cy + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--ios-label-3)"
            >
              {formatTick(tick.value, range)}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {coords.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Guide line marking the selected session. */}
        <line
          x1={activeCoord.cx}
          y1={PAD_T}
          x2={activeCoord.cx}
          y2={PAD_T + PLOT_H}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.4}
        />

        {coords.map((coord, index) => (
          <circle
            key={points[index].ms}
            cx={coord.cx}
            cy={coord.cy}
            r={index === selected ? 4.5 : 2.5}
            fill="currentColor"
            stroke="var(--ios-surface)"
            strokeWidth={index === selected ? 2 : 0}
          />
        ))}

        {/* Generous invisible tap targets — the visible dots are far too small
            to hit with a thumb. */}
        {coords.map((coord, index) => (
          <circle
            key={`hit-${points[index].ms}`}
            cx={coord.cx}
            cy={coord.cy}
            r={12}
            fill="transparent"
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`${points[index].shortDate}: ${formatTick(
              points[index].value,
              range,
            )} ${unit}`}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelected(index);
              }
            }}
          />
        ))}

        <text
          x={PAD_L}
          y={VB_H - 8}
          fontSize={9}
          fill="var(--ios-label-3)"
          textAnchor="start"
        >
          {points[0].shortDate}
        </text>
        {points.length > 1 && (
          <text
            x={PAD_L + PLOT_W}
            y={VB_H - 8}
            fontSize={9}
            fill="var(--ios-label-3)"
            textAnchor="end"
          >
            {points.at(-1)!.shortDate}
          </text>
        )}
      </svg>

      <p className="px-4 pb-3 text-[13px] text-label2">
        {points.length === 1 ? singleHint : `Tap any point to see that ${noun}.`}
      </p>
    </div>
  );
}
