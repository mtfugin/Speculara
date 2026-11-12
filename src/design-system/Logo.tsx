/* Speculara logo family.
   Mark: three rising bars and their reflection in a mirror ("speculum" is Latin for mirror).
   The bars are what you measured; the reflection is what you learn from it.
   It reads at 16px, works in one color, and animates naturally: the bars rise, then the reflection answers.
   Wordmark: Sora Bold, set as live text so it stays sharp. */

type Tone = "color" | "mono" | "reversed" | "onLight";
const TONES: Record<Tone, { a: string; b: string; word: string; reflect: number }> = {
  color: { a: "var(--color-ink)", b: "var(--color-orange)", word: "var(--color-ink)", reflect: 0.9 },
  mono: { a: "currentColor", b: "currentColor", word: "currentColor", reflect: 0.45 },
  reversed: { a: "var(--color-white)", b: "var(--color-orange)", word: "var(--color-white)", reflect: 0.9 },
  onLight: { a: "#18181b", b: "#ea580c", word: "#18181b", reflect: 0.9 },
};

/** Bar geometry on a 48 grid: three bars, 8 wide, 4 apart; mirror axis at y = 24. */
export const MARK_BARS = [
  { x: 8, h: 8 },
  { x: 20, h: 14 },
  { x: 32, h: 20 },
] as const;
export const MARK_AXIS = 24;
export const MARK_GAP = 3;

export function LogoMark({ size = 32, tone = "color", title }: { size?: number; tone?: Tone; title?: string }) {
  const t = TONES[tone];
  const top = MARK_AXIS - MARK_GAP;
  const bottom = MARK_AXIS + MARK_GAP;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {MARK_BARS.map((b) => (
        <g key={b.x}>
          <rect x={b.x} y={top - b.h} width="8" height={b.h} rx="3" fill={t.a} />
          <rect x={b.x} y={bottom} width="8" height={b.h} rx="3" fill={t.b} opacity={t.reflect} />
        </g>
      ))}
    </svg>
  );
}

export function Wordmark({ tone = "color", className = "" }: { tone?: Tone; className?: string }) {
  return (
    <span className={`font-wordmark leading-none ${className}`} style={{ color: TONES[tone].word }}>
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
          <span className="mt-1 text-xs font-medium tracking-wide" style={{ color: tone === "reversed" ? "var(--color-white)" : tone === "onLight" ? "#52525b" : "var(--color-text-secondary)" }}>
            Honest numbers. Plain words.
          </span>
        )}
      </span>
    </span>
  );
}
