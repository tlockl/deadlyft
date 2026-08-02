"use client";

import { useState, useTransition } from "react";
import { deleteWorkout } from "@/app/actions/workouts";

/**
 * Two-tap delete. A native confirm() dialog is jarring inside a home-screen
 * web app, so the button confirms in place instead.
 */
export default function DeleteWorkoutButton({
  workoutId,
}: {
  workoutId: string;
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
      const result = await deleteWorkout(workoutId);
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="px-4 pt-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="ios-press flex h-[50px] w-full items-center justify-center rounded-[12px] bg-surface text-[17px] font-medium text-danger disabled:opacity-40"
      >
        {pending
          ? "Deleting…"
          : confirming
            ? "Tap again to delete"
            : "Delete Workout"}
      </button>
      {confirming && !pending && (
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="mt-2 w-full text-center text-[15px] text-label2"
        >
          Cancel
        </button>
      )}
      {error && (
        <p className="mt-2 text-center text-[13px] text-danger">{error}</p>
      )}
    </div>
  );
}
