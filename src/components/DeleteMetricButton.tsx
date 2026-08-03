"use client";

import { useState, useTransition } from "react";
import { deleteBodyMetric } from "@/app/actions/body";
import { CloseIcon } from "@/components/icons";

/**
 * Two-tap delete for one reading, sized to sit at the end of a list row. Same
 * confirm-in-place idea as deleting a workout -- a native confirm() dialog is
 * jarring inside a home-screen web app -- but compact, because there is one of
 * these on every row.
 */
export default function DeleteMetricButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteBodyMetric(id);
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  if (error) {
    return <span className="shrink-0 text-[13px] text-danger">{error}</span>;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={pending}
      aria-label={confirming ? `Confirm deleting ${label}` : `Delete ${label}`}
      className={`ios-press shrink-0 rounded-[6px] px-2 py-1 text-[13px] font-medium disabled:opacity-40 ${
        confirming ? "bg-danger text-white" : "text-label3"
      }`}
    >
      {pending ? "…" : confirming ? "Delete" : <CloseIcon className="h-4 w-4" />}
    </button>
  );
}
