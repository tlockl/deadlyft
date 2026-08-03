"use client";

import { useState, useTransition } from "react";
import { saveMovementNote } from "@/app/actions/movements";
import { MAX_NOTE_LENGTH } from "@/lib/movements";
import { NoteIcon } from "@/components/icons";

/**
 * What you need to remember about a movement, kept with the movement.
 *
 * Attached to the *name*, not to the workout, because a seat height is a
 * standing fact about you and that machine rather than something that happened
 * on Tuesday. That also means it survives discarding the session you wrote it
 * in, and shows up the next time you type the name -- which is the whole point,
 * since the alternative it replaces is a photo of the machine in your camera
 * roll that you have to go and find.
 *
 * Reading it is the case that matters, so the note shows in full without being
 * tapped; editing is behind the tap.
 */
export default function MovementNoteCard({
  name,
  note,
  onSaved,
}: {
  name: string;
  note: string;
  /** Lets the logger update its own copy; the exercise page revalidates instead. */
  onSaved?: (body: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Hooks first: a note has nothing to be keyed to until the movement is named.
  const trimmed = name.trim();
  if (trimmed === "") return null;

  function open() {
    setDraft(note);
    setError(null);
    setEditing(true);
  }

  function save() {
    startTransition(async () => {
      const result = await saveMovementNote(trimmed, draft);
      if (result?.error) {
        setError(result.error);
        return;
      }
      onSaved?.(draft.trim());
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        className="ios-press flex w-full items-start gap-2 rounded-[8px] bg-fill px-3 py-2 text-left"
      >
        <NoteIcon className="mt-[1px] h-4 w-4 shrink-0 text-label3" />
        {note ? (
          <span className="min-w-0 flex-1 text-[13px] leading-[18px] whitespace-pre-line">
            {note}
          </span>
        ) : (
          <span className="min-w-0 flex-1 text-[13px] leading-[18px] text-label3">
            Add setup notes
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="rounded-[8px] bg-fill p-2">
      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        rows={3}
        autoFocus
        placeholder="Seat 4, back pad 2, feet high"
        aria-label={`Setup notes for ${trimmed}`}
        className="w-full resize-none rounded-[6px] bg-surface px-2.5 py-2 text-[15px] leading-[20px] outline-none placeholder:text-label3 focus:ring-2 focus:ring-accent"
      />
      <div className="flex items-center gap-2 pt-1.5">
        <span className="flex-1 text-[11px] text-label3">
          {draft.length}/{MAX_NOTE_LENGTH}
        </span>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={pending}
          className="ios-press rounded-[6px] px-3 py-1.5 text-[13px] font-medium text-label2 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="ios-press rounded-[6px] bg-accent px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="pt-1 text-[13px] text-danger">{error}</p>}
    </div>
  );
}
