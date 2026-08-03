"use client";

import { useEffect } from "react";
import Segmented from "@/components/Segmented";
import { CloseIcon } from "@/components/icons";
import { chime, unlockChime } from "@/lib/chime";
import { formatStopwatch } from "@/lib/units";
import {
  cardioElapsedMs,
  cardioTargetMs,
  type CardioDraft,
} from "@/lib/drafts";

/**
 * One cardio timer in the logger.
 *
 * The elapsed time is never counted down or up by an interval -- it is derived
 * from wall-clock timestamps in `cardioElapsedMs`, for the reasons set out with
 * `CardioDraft` in lib/drafts.ts. This component only renders that number and
 * reports taps back up.
 */

/**
 * Minute presets for the usual treadmill and bike blocks. Five is the most that
 * fit on one row of a narrow phone, and a second row of chips costs more space
 * than the minutes field they save typing into.
 */
const PRESET_MINUTES = [5, 10, 15, 20, 30];

export default function CardioTimer({
  draft,
  index,
  now,
  onChange,
  onRemove,
}: {
  draft: CardioDraft;
  index: number;
  now: number;
  onChange: (patch: Partial<CardioDraft>) => void;
  onRemove?: () => void;
}) {
  const running = draft.runningSince !== null;
  const targetMs = cardioTargetMs(draft);
  const elapsedMs = cardioElapsedMs(draft, now);
  const finished = draft.countdown && targetMs > 0 && elapsedMs >= targetMs;

  // Stopping is a state change, so it can't happen while rendering. Banking
  // exactly `targetMs` rather than the elapsed time it overshot by means a
  // countdown that ran out records the round number the user asked for.
  useEffect(() => {
    if (!running || !draft.countdown || targetMs <= 0) return;
    if (elapsedMs < targetMs) return;

    onChange({ runningSince: null, bankedMs: targetMs });
    chime();
  }, [running, draft.countdown, targetMs, elapsedMs, onChange]);

  // Counting down shows time left, rounded up so a fresh 20:00 timer reads
  // 20:00 for its first second instead of flicking straight to 19:59.
  const displayMs = draft.countdown
    ? Math.ceil(Math.max(0, targetMs - elapsedMs) / 1000) * 1000
    : elapsedMs;

  const status = finished
    ? "Done"
    : running
      ? draft.countdown
        ? `${formatStopwatch(elapsedMs)} elapsed`
        : "Counting up"
      : elapsedMs > 0
        ? "Paused"
        : draft.countdown
          ? "Ready to count down"
          : "Ready to count up";

  function handleStart() {
    // Has to happen on the tap itself: iOS will not open an audio context from
    // a timer callback, so unlocking it later -- when the countdown actually
    // ends -- is too late for the chime.
    unlockChime();
    onChange({ runningSince: Date.now() });
  }

  function handlePause() {
    onChange({ runningSince: null, bankedMs: elapsedMs });
  }

  const timeInputClass =
    "h-[36px] w-[62px] rounded-[8px] bg-fill text-center text-[17px] tabular outline-none focus:ring-2 focus:ring-accent";

  return (
    <section className="overflow-hidden rounded-[10px] bg-surface">
      <div className="flex items-center gap-2 px-4 pt-3">
        <input
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={`Cardio ${index + 1}`}
          maxLength={80}
          className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none"
        />
        {onRemove && (
          <button
            type="button"
            aria-label={`Remove cardio ${index + 1}`}
            onClick={onRemove}
            className="shrink-0 p-1 text-label3"
          >
            <CloseIcon className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      <div className="px-4 pt-3">
        <Segmented
          ariaLabel={`Cardio ${index + 1} timer type`}
          value={draft.countdown ? "down" : "up"}
          onChange={(value) => onChange({ countdown: value === "down" })}
          options={[
            { value: "down", label: "Countdown" },
            { value: "up", label: "Count Up" },
          ]}
        />
      </div>

      {draft.countdown && (
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-[15px] text-label2">Target</span>
            <input
              inputMode="numeric"
              aria-label={`Cardio ${index + 1} target minutes`}
              value={draft.targetMinutes}
              onChange={(event) =>
                onChange({
                  targetMinutes: event.target.value
                    .replace(/[^0-9]/g, "")
                    .slice(0, 3),
                })
              }
              className={timeInputClass}
            />
            <span className="text-[13px] text-label2">min</span>
            <input
              inputMode="numeric"
              aria-label={`Cardio ${index + 1} target seconds`}
              value={draft.targetSeconds}
              onChange={(event) =>
                onChange({
                  targetSeconds: event.target.value
                    .replace(/[^0-9]/g, "")
                    .slice(0, 2),
                })
              }
              className={timeInputClass}
            />
            <span className="text-[13px] text-label2">sec</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_MINUTES.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() =>
                  onChange({
                    targetMinutes: String(minutes),
                    targetSeconds: "",
                  })
                }
                className={`rounded-full px-3 py-[5px] text-[13px] font-medium ${
                  Number.parseInt(draft.targetMinutes, 10) === minutes &&
                  !Number.parseInt(draft.targetSeconds, 10)
                    ? "bg-accent text-white"
                    : "bg-fill text-label2"
                }`}
              >
                {minutes}m
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pt-4 pb-4 text-center">
        <p
          role="timer"
          aria-label={`Cardio ${index + 1} timer`}
          className={`text-[48px] leading-[52px] font-bold tabular tracking-[-1px] ${
            finished ? "text-success" : running ? "text-label" : "text-label2"
          }`}
        >
          {formatStopwatch(displayMs)}
        </p>
        <p className="mt-1 text-[13px] text-label2">{status}</p>
      </div>

      <div className="flex border-t border-separator">
        <button
          type="button"
          onClick={running ? handlePause : handleStart}
          disabled={finished || (draft.countdown && targetMs === 0)}
          className="ios-press flex-1 py-[11px] text-[15px] font-semibold text-accent disabled:text-label3"
        >
          {finished
            ? "Done"
            : running
              ? "Pause"
              : elapsedMs > 0
                ? "Resume"
                : "Start"}
        </button>
        <button
          type="button"
          onClick={() => onChange({ runningSince: null, bankedMs: 0 })}
          disabled={elapsedMs === 0}
          className="ios-press flex-1 border-l border-separator py-[11px] text-[15px] font-medium text-label2 disabled:text-label3"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
