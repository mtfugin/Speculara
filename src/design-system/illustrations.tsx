/* Illustration set: minimal flat geometry from the logo (circles, the lens between them, bars, one thin line).
   Palette only: ink, sky, track, white, wine (caution). No text inside artwork, all decorative (aria-hidden).
   Shared frame: viewBox 240 x 160. */
import type { ReactNode } from "react";

const INK = "var(--color-ink)";
const ORANGE = "var(--color-orange)";
const TRACK = "var(--color-track)";
const LINE = "var(--color-border-default)";
const CARD = "var(--color-card)";
const CANVAS = "var(--color-canvas)";
const WINE = "var(--color-wine)";

function Frame({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 240 160" fill="none" aria-hidden="true" focusable="false" role="presentation">
      {children}
    </svg>
  );
}
const Ground = () => <line x1="40" y1="132" x2="200" y2="132" stroke={LINE} strokeWidth="2" strokeLinecap="round" />;

export const Illustrations = {
  welcome: (c?: string) => (
    <Frame className={c}>
      <Ground />
      <rect x="62" y="96" width="22" height="36" rx="5" fill={ORANGE} />
      <rect x="94" y="72" width="22" height="60" rx="5" fill={ORANGE} />
      <rect x="126" y="44" width="22" height="88" rx="5" fill={INK} />
      <circle cx="178" cy="56" r="20" fill={INK} opacity=".9" />
      <circle cx="192" cy="70" r="20" fill={ORANGE} opacity=".9" />
    </Frame>
  ),
  upload: (c?: string) => (
    <Frame className={c}>
      <circle cx="120" cy="80" r="52" stroke={TRACK} strokeWidth="2" strokeDasharray="4 7" />
      <rect x="88" y="42" width="64" height="82" rx="10" fill={CARD} stroke={LINE} strokeWidth="2" />
      <line x1="100" y1="64" x2="140" y2="64" stroke={TRACK} strokeWidth="4" strokeLinecap="round" />
      <line x1="100" y1="78" x2="132" y2="78" stroke={TRACK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="104" r="12" fill={INK} />
      <path d="M120 110 V98 M115 103 L120 98 L125 103" stroke={CANVAS} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  ),
  processing: (c?: string) => (
    <Frame className={c}>
      <path d="M52 80 H188" stroke={LINE} strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      <circle cx="98" cy="80" r="32" fill={INK} />
      <circle cx="142" cy="80" r="32" fill={ORANGE} />
    </Frame>
  ),
  empty: (c?: string) => (
    <Frame className={c}>
      <circle cx="120" cy="80" r="46" stroke={TRACK} strokeWidth="2.5" strokeDasharray="6 8" />
      <circle cx="120" cy="80" r="14" fill={CARD} stroke={LINE} strokeWidth="2" />
      <path d="M120 74 V86 M114 80 H126" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </Frame>
  ),
  success: (c?: string) => (
    <Frame className={c}>
      <circle cx="104" cy="80" r="36" fill={INK} />
      <circle cx="136" cy="80" r="36" fill={ORANGE} />
      <path d="M108 82 L118 92 L134 70" stroke={CANVAS} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  ),
  error: (c?: string) => (
    <Frame className={c}>
      <circle cx="120" cy="80" r="42" fill={CARD} stroke={WINE} strokeWidth="3" />
      <path d="M120 62 V84" stroke={WINE} strokeWidth="5" strokeLinecap="round" />
      <circle cx="120" cy="98" r="3.5" fill={WINE} />
    </Frame>
  ),
  needsData: (c?: string) => (
    <Frame className={c}>
      <Ground />
      <rect x="66" y="96" width="22" height="36" rx="5" stroke={TRACK} strokeWidth="2.5" strokeDasharray="5 5" />
      <rect x="98" y="76" width="22" height="56" rx="5" stroke={TRACK} strokeWidth="2.5" strokeDasharray="5 5" />
      <rect x="130" y="56" width="22" height="76" rx="5" stroke={TRACK} strokeWidth="2.5" strokeDasharray="5 5" />
      <circle cx="176" cy="48" r="9" fill={ORANGE} />
    </Frame>
  ),
  chat: (c?: string) => (
    <Frame className={c}>
      <rect x="64" y="40" width="88" height="52" rx="16" fill={INK} />
      <rect x="92" y="72" width="88" height="52" rx="16" fill={ORANGE} />
      <circle cx="136" cy="98" r="3.5" fill={CANVAS} />
      <circle cx="150" cy="98" r="3.5" fill={CANVAS} />
      <circle cx="164" cy="98" r="3.5" fill={CANVAS} />
    </Frame>
  ),
} as const;

export type IllustrationName = keyof typeof Illustrations;

export function Illustration({ name, className = "" }: { name: IllustrationName; className?: string }) {
  return Illustrations[name](className);
}
