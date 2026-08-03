"use client";

import { useState } from "react";
import type { WeightUnit } from "@/generated/prisma/enums";
import {
  barsFor,
  decompose,
  describeLoadout,
  loadoutTotal,
  platesFor,
  type PlateCounts,
} from "@/lib/plates";
import { unitLabel } from "@/lib/units";
import Segmented from "@/components/Segmented";

/**
 * Tap plates in, instead of adding them up in your head.
 *
 * The weight field stays the one true value -- this only ever writes a number
 * into it. What the panel keeps is which plates you tapped, because a total
 * alone doesn't say how it was made up: 20 + 20 a side and 25 + 15 a side both
 * come to 40, and redrawing your two 20s as a 25 and a 15 would be telling you
 * something untrue about your own bar.
 *
 * Those remembered plates are trusted only while they still add up to what's
 * in the field. Type a weight over the top and they no longer do, so the panel
 * falls back to decomposing the number you typed -- which is also how it opens
 * already showing the last set's loading.
 */
export default function PlatePanel({
  unit,
  weight,
  bar,
  perSide,
  onWeightChange,
  onSettingsChange,
}: {
  unit: WeightUnit;
  /** The set's weight exactly as typed, which may be blank or nonsense. */
  weight: string;
  bar: number;
  perSide: boolean;
  onWeightChange: (weight: string) => void;
  onSettingsChange: (patch: { bar?: number; perSide?: boolean }) => void;
}) {
  const plates = platesFor(unit);
  const bars = barsFor(unit);

  const typed = Number.parseFloat(weight);
  const current = Number.isFinite(typed) ? typed : bar;

  const [tapped, setTapped] = useState<PlateCounts>(
    () => decompose(current, bar, perSide, plates) ?? {},
  );

  // Whatever was tapped still holds only while it accounts for the weight in
  // the field. Once it doesn't -- because that weight was typed instead --
  // fall back to a decomposition of it, which is null for a number no set of
  // plates makes: a machine's stack, or an odd figure entered by hand. Then
  // nothing is shown as loaded and the next plate tapped starts a clean total.
  const explains = Math.abs(loadoutTotal(tapped, bar, perSide) - current) < 1e-9;
  const counts: PlateCounts = explains
    ? tapped
    : (decompose(current, bar, perSide, plates) ?? {});

  const total = loadoutTotal(counts, bar, perSide);
  const summary = describeLoadout(counts);

  function write(next: PlateCounts) {
    setTapped(next);
    const value = loadoutTotal(next, bar, perSide);
    onWeightChange(value === 0 ? "" : String(value));
  }

  const change = (plate: number, delta: number) => {
    const count = (counts[plate] ?? 0) + delta;
    write({ ...counts, [plate]: Math.max(0, count) });
  };

  /**
   * Changing the bar or the sides re-reads the same plates against the new
   * setting, so the total moves and the loadout you tapped in stays put --
   * switching to a 45 bar adds 45, rather than silently re-interpreting what
   * is already in the field.
   */
  function reload(patch: { bar?: number; perSide?: boolean }) {
    const nextBar = patch.bar ?? bar;
    const nextPerSide = patch.perSide ?? perSide;
    onSettingsChange(patch);
    setTapped(counts);
    const value = loadoutTotal(counts, nextBar, nextPerSide);
    onWeightChange(value === 0 ? "" : String(value));
  }

  return (
    <div className="col-span-5 rounded-[8px] bg-fill px-3 py-2.5">
      <div className="grid grid-cols-6 gap-1.5">
        {plates.map((plate) => {
          const count = counts[plate] ?? 0;
          return (
            <div key={plate} className="relative">
              <button
                type="button"
                onClick={() => change(plate, 1)}
                aria-label={`Add a ${plate} ${unitLabel(unit)} plate`}
                className="ios-press h-[42px] w-full rounded-[8px] bg-surface text-[15px] font-semibold tabular"
              >
                {plate}
              </button>
              {count > 0 && (
                // A sibling rather than a child: nesting buttons isn't valid
                // HTML, and this one has to be tappable in its own right.
                <button
                  type="button"
                  onClick={() => change(plate, -1)}
                  aria-label={`Remove a ${plate} ${unitLabel(unit)} plate`}
                  className="absolute -top-1.5 -right-1.5 h-[22px] min-w-[22px] rounded-full bg-accent px-1 text-[12px] font-bold tabular text-white"
                >
                  {count}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="pt-2 text-[13px] leading-[18px] text-label2">
        {summary ? (
          <>
            <span className="text-label">{summary}</span>
            {perSide ? " per side" : " on one side"}
            {bar > 0 && ` + ${bar} bar`} ={" "}
            <span className="font-semibold text-label tabular">
              {total} {unitLabel(unit)}
            </span>
          </>
        ) : (
          "Tap a plate to load it. Tap its badge to take one off."
        )}
      </p>

      <div className="flex gap-2 pt-2.5">
        <div className="flex-1">
          <p className="pb-1 text-[11px] text-label3 uppercase tracking-[0.5px]">
            Bar
          </p>
          <Segmented
            ariaLabel="Bar weight"
            options={bars.map((value) => ({
              value: String(value),
              label: value === 0 ? "None" : String(value),
            }))}
            value={String(bar)}
            onChange={(value) => reload({ bar: Number(value) })}
          />
        </div>
        <div className="flex-1">
          <p className="pb-1 text-[11px] text-label3 uppercase tracking-[0.5px]">
            Loaded
          </p>
          <Segmented
            ariaLabel="How the plates are loaded"
            options={[
              { value: "2", label: "Both sides" },
              { value: "1", label: "One side" },
            ]}
            value={perSide ? "2" : "1"}
            onChange={(value) => reload({ perSide: value === "2" })}
          />
        </div>
      </div>
    </div>
  );
}
