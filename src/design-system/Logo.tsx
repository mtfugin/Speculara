/* Speculara logo family.
   Mark: two circles (the thing, and its reflection) whose shared lens is cut away.
   The cut is a mask, so the mark works on any background, light or dark.
   Wordmark: Sora Bold, set as live text so it stays sharp and uses the product font.
   Colors only come from existing tokens: ink, sky, primary, white. */
import { useId } from "react";

type Tone = "color" | "mono" | "reversed";
const TONES: Record<Tone, { a: string; b: string; word: string }> = {
  color: { a: "var(--color-ink)", b: "var(--color-sky)", word: "var(--color-ink)" },
  mono: { a: "currentColor", b: "currentColor", word: "currentColor" },
  reversed: { a: "var(--color-white)", b: "var(--color-sky)", word: "var(--color-white)" },
};

export function LogoMark({ size = 32, tone = "color", title }: { size?: number; tone?: Tone; title?: string }) {
  const id = useId().replace(/:/g, "");
  const t = TONES[tone];
  /* Below 20px the lens would close up, so small sizes use a wider gap between the circles. */
  const gap = size < 20 ? 3 : 0;
  const a = { cx: 19 - gap / 2, cy: 19 - gap / 2, r: 15 };
  const b = { cx: 29 + gap / 2, cy: 29 + gap / 2, r: 15 };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <defs>
        <clipPath id={`${id}c`}><circle {...a} /></clipPath>
        <mask id={`${id}m`}>
          <rect width="48" height="48" fill="white" />
          <g clipPath={`url(#${id}c)`}><circle {...b} fill="black" /></g>
        </mask>
      </defs>
      <g mask={`url(#${id}m)`}>
        <circle {...a} fill={t.a} />
        <circle {...b} fill={t.b} />
      </g>
    </svg>
  );
}

export function Wordmark({ tone = "color", className = "" }: { tone?: Tone; className?: string }) {
  return (
    <span className={`font-display font-bold leading-none tracking-tight ${className}`} style={{ color: TONES[tone].word }}>
      Speculara
    </span>
  );
}

export function Logo({
  variant = "horizontal",
  tone = "color",
  size = 32,
  tagline = false,
}: {
  variant?: "horizontal" | "stacked" | "mark" | "wordmark";
  tone?: Tone;
  size?: number;
  tagline?: boolean;
}) {
  if (variant === "mark") return <LogoMark size={size} tone={tone} title="Speculara" />;
  if (variant === "wordmark") return <Wordmark tone={tone} className="text-xl" />;
  const stacked = variant === "stacked";
  return (
    <span className={`inline-flex ${stacked ? "flex-col items-center gap-2" : "items-center gap-2.5"}`} role="img" aria-label="Speculara">
      <LogoMark size={size} tone={tone} />
      <span className={`flex flex-col ${stacked ? "items-center" : ""}`}>
        <Wordmark tone={tone} className={stacked ? "text-2xl" : "text-xl"} />
        {tagline && (
          <span className="mt-1 text-xs font-medium tracking-wide" style={{ color: tone === "reversed" ? "var(--color-white)" : "var(--color-text-secondary)" }}>
            Honest numbers. Plain words.
          </span>
        )}
      </span>
    </span>
  );
}
