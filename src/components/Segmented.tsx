"use client";

/** iOS segmented control: a pill slides under the selected option. */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex rounded-[9px] bg-fill p-[2px]"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-[7px] py-[6px] text-[13px] font-medium transition-colors ${
              selected
                ? "bg-surface text-label shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                : "text-label2"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
