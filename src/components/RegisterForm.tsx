"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { register, type AuthState } from "@/app/actions/auth";
import Field from "@/components/Field";
import Segmented from "@/components/Segmented";
import { FilledButton } from "@/components/ui";

const UNITS = [
  { value: "LB", label: "Pounds (lb)" },
  { value: "KG", label: "Kilograms (kg)" },
] as const;

export default function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    register,
    undefined,
  );
  const [unit, setUnit] = useState<"LB" | "KG">("LB");

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[10px] bg-surface">
        <Field
          id="name"
          name="name"
          label="Name"
          placeholder="Alex"
          autoComplete="name"
          required
          defaultValue={state?.values?.name}
          error={state?.errors?.name?.[0]}
        />
        <Field
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
          required
          defaultValue={state?.values?.email}
          error={state?.errors?.email?.[0]}
        />
        <Field
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="8+ characters"
          autoComplete="new-password"
          required
          error={state?.errors?.password?.[0]}
        />
      </div>

      <div className="rounded-[10px] bg-surface px-4 py-3">
        <p className="pb-2 text-[15px]">Weight unit</p>
        <Segmented
          ariaLabel="Weight unit"
          options={UNITS}
          value={unit}
          onChange={setUnit}
        />
        <input type="hidden" name="unit" value={unit} />
        <p className="pt-2 text-[13px] leading-[18px] text-label2">
          You can change this later, and it restates every workout you&apos;ve
          logged.
        </p>
      </div>

      {state?.message && (
        <p className="px-1 text-[13px] leading-[18px] text-danger">
          {state.message}
        </p>
      )}

      <FilledButton type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create Account"}
      </FilledButton>

      <p className="text-center text-[15px] text-label2">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent">
          Sign in
        </Link>
      </p>
    </form>
  );
}
