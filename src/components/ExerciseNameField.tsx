"use client";

import { useId, useMemo, useState } from "react";
import { exerciseKey } from "@/lib/movements";

const MAX_SUGGESTIONS = 6;

/**
 * The exercise name box, with the movements you've already logged offered
 * underneath it.
 *
 * This exists to stop duplicates rather than to save typing. A movement is
 * identified by its name, so "Chest Press" and "Machine Chest Press" are two
 * different movements with two half-length charts, and no amount of cleverness
 * afterwards can tell whether that was a slip or a real distinction. Offering
 * the exact name you used last time is the only point at which that's cheap to
 * get right.
 *
 * Suggestions appear on focus, not just once you've typed something: the
 * common case is repeating a movement you did last week, and recognising the
 * name in a list beats remembering how you spelled it.
 */
export default function ExerciseNameField({
  value,
  onChange,
  movements,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  movements: string[];
  placeholder: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const typed = value.trim().toLowerCase();

    // Nothing typed yet: the most recent movements, which `movements` is
    // already ordered by.
    if (typed === "") return movements.slice(0, MAX_SUGGESTIONS);

    // An exact match means the name is already settled -- keeping the list up
    // would just cover the next field with a suggestion to type what's typed.
    if (movements.some((name) => exerciseKey(name) === typed)) return [];

    const matches = movements.filter((name) =>
      name.toLowerCase().includes(typed),
    );

    // Names that *start* with what's typed first: typing "in" while you mean
    // Incline Press shouldn't rank "Seated Row (Wide)" above it.
    return matches
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(typed) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(typed) ? 0 : 1;
        return aStarts - bStarts;
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [value, movements]);

  const showing = open && suggestions.length > 0;

  return (
    <div className="relative min-w-0 flex-1">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        maxLength={80}
        autoComplete="off"
        role="combobox"
        aria-expanded={showing}
        aria-controls={showing ? listId : undefined}
        aria-autocomplete="list"
        className="w-full bg-transparent text-[17px] font-semibold outline-none"
      />

      {showing && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Movements you've logged before"
          // Capped and scrollable: with the keyboard up there isn't room for
          // six rows, and a list running off the screen hides the ones the
          // ranking worked to put at the bottom.
          className="absolute top-full right-0 left-0 z-30 mt-1 max-h-[228px] overflow-y-auto overscroll-contain rounded-[10px] border border-separator bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
        >
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                // Pointer-down, not click: a tap blurs the input first, and by
                // the time click fires the list has already closed and the
                // button is gone. preventDefault keeps focus where it is so
                // the blur never happens at all.
                onPointerDown={(event) => {
                  event.preventDefault();
                  onChange(name);
                  setOpen(false);
                }}
                className="ios-press block w-full truncate border-b border-separator px-3 py-[11px] text-left text-[15px] last:border-b-0 active:bg-press"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
