"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import Field from "@/components/Field";
import Segmented from "@/components/Segmented";
import { FilledButton } from "@/components/ui";

const UNITS = [
  { value: "LB", label: "Pounds (lb)" },
  { value: "KG", label: "Kilograms (kg)" },
] as const;

export default function ProfileForm({
  name: initialName,
  unit: initialUnit,
}: {
  name: string;
  unit: "LB" | "KG";
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    undefined,
  );
  const [unit, setUnit] = useState<"LB" | "KG">(initialUnit);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="mx-4 overflow-hidden rounded-[10px] bg-surface">
        <Field
          id="name"
          name="name"
          label="Name"
          defaultValue={initialName}
          required
        />
      </div>

      <div className="mx-4 rounded-[10px] bg-surface px-4 py-3">
        <p className="pb-2 text-[15px]">Weight unit</p>
        <Segmented
          ariaLabel="Weight unit"
          options={UNITS}
          value={unit}
          onChange={setUnit}
        />
        <input type="hidden" name="unit" value={unit} />
        <p className="pt-2 text-[13px] leading-[18px] text-label2">
          Weights are stored once and converted for display, so switching units
          restates every workout you&apos;ve logged.
        </p>
      </div>

      <div className="px-4">
        <FilledButton type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </FilledButton>
        {state?.ok && (
          <p className="mt-2 text-center text-[13px] text-success">Saved.</p>
        )}
        {state?.error && (
          <p className="mt-2 text-center text-[13px] text-danger">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
