/**
 * A user's photo, falling back to their initials on a colour derived from their
 * name — the way Contacts and Mail do it on iOS.
 *
 * Presentational and server-renderable, so it can be dropped into a future
 * friends list without changes.
 */

// Muted tones that stay legible under white text in both colour schemes.
const COLORS = [
  "#8E8E93",
  "#FF9500",
  "#34C759",
  "#5856D6",
  "#FF375F",
  "#00A0B0",
  "#AF52DE",
  "#C77800",
];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.slice(0, 2).map((word) => [...word][0] ?? "");
  return letters.join("").toUpperCase();
}

function colorFor(seed: string): string {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.codePointAt(0)!) >>> 0;
  }
  return COLORS[hash % COLORS.length];
}

export default function Avatar({
  name,
  src,
  size = 40,
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const dimensions = { width: size, height: size };

  if (src) {
    return (
      // Plain <img>, not next/image: these bytes are served from an
      // authorized route that the image optimizer can't fetch on our behalf.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name}'s profile photo`}
        style={dimensions}
        className={`shrink-0 rounded-full bg-fill object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{ ...dimensions, backgroundColor: colorFor(name) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{initials(name)}</span>
    </div>
  );
}
