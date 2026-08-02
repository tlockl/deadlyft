"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/**
 * Submit button for a server-action form, with a pending label.
 *
 * Deliberately only the *button* is a client component: the <form> itself stays
 * in a Server Component, which is what lets the submission go through as a
 * plain HTML POST when JavaScript hasn't loaded (or has failed). An onClick
 * handler would silently do nothing in that situation.
 */
export default function SubmitButton({
  children,
  pendingLabel,
  className = "",
}: {
  children: ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`ios-tap flex h-[50px] w-full items-center justify-center rounded-[12px] bg-accent text-[17px] font-semibold text-white disabled:opacity-40 ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
