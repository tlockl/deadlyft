import type { SVGProps } from "react";

// Line-drawn glyphs in the spirit of SF Symbols: 1.75 stroke, round caps.
const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </svg>
  );
}

export function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} strokeWidth={2.25} {...props}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} strokeWidth={2.25} {...props}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} strokeWidth={2} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} strokeWidth={2} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function DumbbellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9v6M6.5 7v10M17.5 7v10M21 9v6M6.5 12h11" />
    </svg>
  );
}

/** A weight plate, seen face on. */
export function PlateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

/** The classic loop arrows, for repeating the set you just logged. */
export function RepeatIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M17 3.5 20.5 7 17 10.5" />
      <path d="M20.5 7H7a3.5 3.5 0 0 0-3.5 3.5V12" />
      <path d="M7 20.5 3.5 17 7 13.5" />
      <path d="M3.5 17h13.5a3.5 3.5 0 0 0 3.5-3.5V12" />
    </svg>
  );
}

/** A bathroom scale, read as a dial inside a rounded platform. */
export function ScaleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="4.5" />
      <path d="M7.75 15.25a4.25 4.25 0 0 1 8.5 0" />
      <path d="M12 15.25 14.4 12" />
    </svg>
  );
}

export function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3s5 4.2 5 8.6a5 5 0 0 1-10 0C7 9.4 9 8 9 8s.4 2 1.6 2.6C11 9 12 7 12 3Z" />
    </svg>
  );
}
