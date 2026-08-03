import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/dal";
import {
  BODY_METRIC_KINDS,
  BODY_METRICS,
  bmi,
  chartUnit,
  chartValue,
  cmToFeetInches,
  formatHeight,
  formatMetric,
  getBodyLog,
  todayKey,
  trailingChange,
} from "@/lib/body";
import { logBodyMetrics } from "@/app/actions/body";
import {
  formatDayLabel,
  formatShortDate,
  fromKg,
  unitLabel,
} from "@/lib/units";
import {
  LargeTitle,
  SectionHeader,
  InsetGroup,
  InfoRow,
  StatTile,
  EmptyState,
} from "@/components/ui";
import { ScaleIcon } from "@/components/icons";
import Field from "@/components/Field";
import SubmitButton from "@/components/SubmitButton";
import BodyProgress, { type BodySeries } from "@/components/BodyProgress";
import DeleteMetricButton from "@/components/DeleteMetricButton";
import type { ChartPoint } from "@/components/ProgressChart";

export const metadata: Metadata = { title: "Body" };

// Same arrangement as the photo actions: the outcome arrives as a redirect
// param, so the form stays server-rendered.
const LOG_MESSAGES: Record<string, { text: string; ok: boolean }> = {
  saved: { text: "Measurement logged.", ok: true },
  empty: { text: "Fill in at least one measurement.", ok: false },
  weight: { text: "That weight didn't look right.", ok: false },
  height: { text: "That height didn't look right.", ok: false },
  fat: { text: "Body fat should be a percentage, like 18.", ok: false },
  date: { text: "That date didn't look right.", ok: false },
  future: { text: "You can't log a measurement in the future.", ok: false },
  gone: { text: "That measurement no longer exists.", ok: false },
};

// A daily weigh-in keeps this list growing forever, and every row carries a
// delete button. The chart still plots everything.
const HISTORY_LIMIT = 50;

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Signed change, using the same typographic minus as the chart. */
function signed(value: number): string {
  const rounded = round1(value);
  if (rounded === 0) return "0";
  return `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}`;
}

// Narrow and fixed rather than flexible: two flex-1 boxes push "ft" into the
// middle of the row, where it reads as a separator instead of a unit.
const INPUT_CELL =
  "h-[46px] w-12 shrink-0 bg-transparent text-[17px] outline-none placeholder:text-label3";

export default async function BodyPage({
  searchParams,
}: {
  searchParams: Promise<{ log?: string }>;
}) {
  const user = await getCurrentUser();
  const log = await getBodyLog(user.id);
  const { log: result } = await searchParams;

  const message = result ? LOG_MESSAGES[result] : undefined;

  // Every series is converted and date-formatted here, so the chart stays
  // presentational and the client never re-derives a unit or a date string.
  const series: BodySeries[] = BODY_METRIC_KINDS.map((kind) => ({
    value: kind,
    label: BODY_METRICS[kind].label,
    unit: chartUnit(kind, user.unit),
    points: log.series[kind].map<ChartPoint>((point) => ({
      ms: point.recordedAt.getTime(),
      value: chartValue(kind, point.value, user.unit),
      shortDate: formatShortDate(point.recordedAt),
      fullDate: formatDayLabel(point.recordedAt),
    })),
  }));

  const latestWeight = log.latest.WEIGHT;
  const latestHeight = log.latest.HEIGHT;
  const latestFat = log.latest.BODY_FAT;

  const weightChange = trailingChange(log.series.WEIGHT, 30);
  const bodyMassIndex =
    latestWeight && latestHeight
      ? bmi(latestWeight.value, latestHeight.value)
      : null;

  const today = todayKey();
  const heightHint = latestHeight ? cmToFeetInches(latestHeight.value) : null;
  const recent = log.entries.slice(0, HISTORY_LIMIT);

  return (
    <div>
      <LargeTitle title="Body" />

      {log.total > 0 && (
        <>
          <div className="px-4 pt-1">
            <BodyProgress series={series} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 px-4">
            <StatTile
              label="Weight"
              value={
                latestWeight
                  ? String(round1(fromKg(latestWeight.value, user.unit)))
                  : "—"
              }
              unit={latestWeight ? unitLabel(user.unit) : undefined}
            />
            <StatTile
              label="30-day"
              value={
                weightChange === null
                  ? "—"
                  : signed(fromKg(weightChange, user.unit))
              }
              unit={weightChange === null ? undefined : unitLabel(user.unit)}
            />
            <StatTile
              label="Body fat"
              value={latestFat ? String(round1(latestFat.value)) : "—"}
              unit={latestFat ? "%" : undefined}
            />
          </div>

          <SectionHeader>Summary</SectionHeader>
          <InsetGroup>
            <InfoRow
              label="Height"
              value={
                latestHeight
                  ? formatHeight(latestHeight.value, user.unit)
                  : "Not logged"
              }
            />
            <InfoRow
              label="BMI"
              value={bodyMassIndex ? String(round1(bodyMassIndex)) : "—"}
              last
            />
          </InsetGroup>
          <p className="px-5 pt-2 text-[13px] leading-[18px] text-label2">
            {bodyMassIndex
              ? "BMI is weight ÷ height², shown without a category: it can't tell muscle from fat, so it says little on its own about someone who lifts."
              : "Log a height and a weight to see BMI."}
          </p>
        </>
      )}

      <SectionHeader>Log a measurement</SectionHeader>
      <form action={logBodyMetrics}>
        <InsetGroup>
          <Field
            id="weight"
            name="weight"
            label="Weight"
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            placeholder={unitLabel(user.unit)}
          />

          {user.unit === "LB" ? (
            <div className="border-b border-separator">
              <div className="flex items-center gap-3 px-4">
                <label
                  htmlFor="heightFeet"
                  className="w-[88px] shrink-0 text-[17px]"
                >
                  Height
                </label>
                <div className="flex flex-1 items-center gap-1.5">
                  <input
                    id="heightFeet"
                    name="heightFeet"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    // No placeholder without a stored height: the "ft" beside
                    // the box already says what goes in it.
                    placeholder={heightHint ? String(heightHint.feet) : undefined}
                    className={INPUT_CELL}
                  />
                  <span className="shrink-0 text-[15px] text-label2">ft</span>
                  <input
                    id="heightInches"
                    name="heightInches"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder={
                      heightHint ? String(heightHint.inches) : undefined
                    }
                    className={INPUT_CELL}
                  />
                  <span className="shrink-0 text-[15px] text-label2">in</span>
                </div>
              </div>
            </div>
          ) : (
            <Field
              id="height"
              name="height"
              label="Height"
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              placeholder={
                latestHeight ? String(round1(latestHeight.value)) : "cm"
              }
            />
          )}

          <Field
            id="bodyFat"
            name="bodyFat"
            label="Body fat"
            type="number"
            step="0.1"
            min="0"
            inputMode="decimal"
            placeholder="%"
          />

          <Field
            id="recordedOn"
            name="recordedOn"
            label="Date"
            type="date"
            defaultValue={today}
            max={today}
          />
        </InsetGroup>

        <div className="px-4 pt-3">
          <SubmitButton pendingLabel="Saving…">Save Measurement</SubmitButton>
          {message && (
            <p
              className={`pt-2 text-center text-[13px] ${
                message.ok ? "text-success" : "text-danger"
              }`}
            >
              {message.text}
            </p>
          )}
          <p className="pt-2 text-[13px] leading-[18px] text-label2">
            Leave anything you didn&apos;t measure blank — only the boxes you
            fill in are recorded, so height goes in once and stays there.
          </p>
        </div>
      </form>

      <SectionHeader>History</SectionHeader>
      {recent.length === 0 ? (
        <InsetGroup>
          <EmptyState
            icon={<ScaleIcon className="h-10 w-10" />}
            title="Nothing measured yet"
            body="Log a weight above and it starts a chart you can watch move over the weeks."
          />
        </InsetGroup>
      ) : (
        <>
          <InsetGroup>
            {recent.map((entry, index) => (
              <div key={entry.id} className="flex items-center gap-3 pl-4">
                <div
                  className={`flex flex-1 items-center justify-between gap-3 py-[11px] pr-4 ${
                    index === recent.length - 1
                      ? ""
                      : "border-b border-separator"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[17px] tabular">
                      {formatMetric(entry.kind, entry.value, user.unit)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-label2">
                      {BODY_METRICS[entry.kind].label} ·{" "}
                      {formatDayLabel(entry.recordedAt)}
                    </p>
                  </div>
                  <DeleteMetricButton
                    id={entry.id}
                    label={`${BODY_METRICS[entry.kind].label} from ${formatShortDate(
                      entry.recordedAt,
                    )}`}
                  />
                </div>
              </div>
            ))}
          </InsetGroup>
          {log.total > recent.length && (
            <p className="px-5 pt-2 text-[13px] text-label2">
              Showing the {recent.length} most recent of {log.total}. The chart
              plots all of them.
            </p>
          )}
        </>
      )}
    </div>
  );
}
