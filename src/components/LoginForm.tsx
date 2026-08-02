"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";
import Field from "@/components/Field";
import { FilledButton } from "@/components/ui";

export default function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-[10px] bg-surface">
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
          placeholder="Required"
          autoComplete="current-password"
          required
          error={state?.errors?.password?.[0]}
        />
      </div>

      {state?.message && (
        <p className="px-1 text-[13px] leading-[18px] text-danger">
          {state.message}
        </p>
      )}

      <FilledButton type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign In"}
      </FilledButton>

      <p className="text-center text-[15px] text-label2">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-accent">
          Sign up
        </Link>
      </p>
    </form>
  );
}
