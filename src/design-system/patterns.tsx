/* Brand patterns, all derived from the logo: circles and the lens they share.
   Colors come from the parent (`currentColor`), so a pattern always follows the palette.
   Rules: low opacity, cropped by its container, never placed behind body text. */
import { useId } from "react";

/** Concentric rings, like ripples on a lens. Hero and loading backdrops. */
export function RingsPattern({ className = "", rings = 7, opacity = 0.14 }: { className?: string; rings?: number; opacity?: number }) {
  return (
    <svg className={className} viewBox="0 0 400 400" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true" focusable="false" style={{ opacity }}>
      {Array.from({ length: rings }, (_, i) => (
        <circle key={i} cx="200" cy="200" r={30 + i * 26} />
      ))}
    </svg>
  );
}

/** Fine dot grid. Behind charts, forms and empty states. */
export function DotGrid({ className = "", gap = 16, opacity = 0.35 }: { className?: string; gap?: number; opacity?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} width="100%" height="100%" aria-hidden="true" focusable="false" style={{ opacity }}>
      <defs>
        <pattern id={id} width={gap} height={gap} patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Two-circle tile: the logo idea repeated. Section dividers and covers. */
export function LensTile({ className = "", size = 56, opacity = 0.12 }: { className?: string; size?: number; opacity?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} width="100%" height="100%" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.25" style={{ opacity }}>
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <circle cx={size * 0.4} cy={size * 0.4} r={size * 0.3} />
          <circle cx={size * 0.6} cy={size * 0.6} r={size * 0.3} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} stroke="none" />
    </svg>
  );
}
