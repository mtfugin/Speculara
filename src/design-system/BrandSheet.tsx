/* Living brand sheet. Open /?brand. It renders the real components and tokens, so it can never drift from the app. */
import { useState } from "react";
import { AnimatedMark } from "./AnimatedMark";
import { Icon, ICONS, type IconName } from "./Icon";
import { Illustrations, type IllustrationName } from "./illustrations";
import { Logo, LogoMark } from "./Logo";
import { DotGrid, LensTile, RingsPattern } from "./patterns";

const logoFiles = import.meta.glob("../assets/branding/logos/*.svg", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const file = (name: string) => logoFiles[`../assets/branding/logos/${name}.svg`];

const COLORS = [
  ["canvas", "--color-canvas"], ["card", "--color-card"], ["raised", "--color-raised"], ["line", "--color-line"], ["line-strong", "--color-line-strong"],
  ["snow", "--color-snow"], ["fog", "--color-fog"], ["mute", "--color-mute"], ["orange", "--color-orange"], ["wine", "--color-wine"],
] as const;
const TYPE = [
  ["Display", "text-5xl font-bold", "56 / 60"], ["H1", "text-4xl font-bold", "40 / 48"], ["H2", "text-3xl font-bold", "32 / 40"],
  ["H3", "text-2xl font-semibold", "24 / 32"], ["H4", "text-xl font-semibold", "20 / 28"], ["H5", "text-lg font-semibold", "18 / 28"],
  ["Body large", "text-base", "16 / 24"], ["Body", "text-sm", "14 / 20"], ["Caption", "text-xs", "12 / 16"],
] as const;
const EASINGS = [
  ["standard", "--ease-standard", "Moves between positions"], ["enter", "--ease-enter", "Things arriving"],
  ["exit", "--ease-exit", "Things leaving (shorter)"], ["emphasis", "--ease-emphasis", "Logo reveal and success only"],
] as const;
const DURATIONS = [
  ["instant", 120, "Press feedback"], ["micro", 200, "Hover, focus, toggles"], ["standard", 280, "Tabs, reveals"], ["component", 380, "Chat, cards"],
  ["page", 480, "Page and result changes"], ["sequence", 900, "Multi-step sequences"], ["brand", 1400, "Logo reveal"], ["ambient", 2400, "Loader cycle"],
] as const;

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="border-t border-border-default py-10">
      <h2 className="font-display text-3xl font-bold text-ink">{title}</h2>
      {note && <p className="mt-1 max-w-2xl text-slate-600">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function BrandSheet() {
  const [replay, setReplay] = useState(0);
  const [slide, setSlide] = useState(false);
  return (
    <div className="mx-auto max-w-[var(--layout-app)] px-[var(--layout-gutter)] pb-24 pt-8">
      <header className="flex items-center justify-between gap-4">
        <Logo size={36} tagline />
        <a className="ctl inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold" href="/">Open the app</a>
      </header>
      <h1 className="mt-10 font-display text-5xl font-bold text-ink">Brand sheet</h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-700">
        Honest numbers. Plain words. A mirror for your marketing numbers: bars that rise, and the reflection that tells you what they mean.
      </p>

      <Section id="logo" title="Logo" note="The mark is a thing and its reflection. The lens they share is cut away, so it works on any background. On the dark interface it is white and sky; on white pages use the onLight version. The wordmark stays Sora Bold. Clear space is half the mark width. Minimum: mark 16px, horizontal lockup 96px.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="surface grid place-items-center rounded-2xl p-10"><Logo size={56} tagline /></div>
          <div className="grid place-items-center rounded-2xl bg-white p-10"><Logo size={56} tone="onLight" tagline /></div>
          <div className="surface grid place-items-center rounded-2xl p-10"><Logo variant="stacked" size={72} /></div>
          <div className="surface flex items-end justify-around gap-6 rounded-2xl p-10">
            {[16, 24, 32, 48, 72].map((s) => <div key={s} className="text-center"><LogoMark size={s} /><p className="mt-2 text-xs text-slate-600">{s}px</p></div>)}
          </div>
          <div className="surface flex items-center justify-around rounded-2xl p-10 text-primary"><LogoMark size={48} tone="mono" /><Logo size={36} tone="mono" /></div>
          <div className="flex items-center justify-around rounded-2xl bg-white p-10 text-neutral-900"><LogoMark size={48} tone="mono" /><Logo size={36} tone="mono" /></div>
        </div>
        <h3 className="mt-8 font-display text-xl font-semibold text-ink">Files</h3>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {Object.keys(logoFiles).map((k) => {
            const name = k.split("/").pop()!.replace(".svg", "");
            return <li key={name} className="well flex items-center gap-3 rounded-xl p-2"><span className={`grid h-9 w-14 place-items-center rounded ${/mono-light|reversed/.test(name) ? "bg-zinc-700" : "bg-white"}`}><img src={file(name)} alt="" className="h-8 w-12 object-contain" /></span><span className="mono truncate">{name}.svg</span></li>;
          })}
        </ul>
        <p className="mt-4 text-sm text-slate-600">Do not stretch, rotate, recolor outside the palette, add shadows or outlines, or place on busy images.</p>
      </Section>

      <Section id="color" title="Color" note="A dark zinc system taken from the hero template: canvas, card and raised surfaces, hairline lines, white and zinc text. Orange is the one accent (data and filled controls), wine is caution. Legacy names (ink, mist, primary) point at these values.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COLORS.map(([n, v]) => (
            <li key={n}><div className="h-16 rounded-xl border border-border-default" style={{ background: `var(${v})` }} /><p className="mt-1 text-sm font-semibold text-ink">{n}</p><p className="mono text-xs text-slate-600">{v}</p></li>
          ))}
        </ul>
      </Section>

      <Section id="type" title="Typography" note="Instrument Serif for headings (one weight, never faux bold), Inter for text and every number, Sora only for the wordmark, JetBrains Mono for statistics. Numbers use Inter because the serif digits are hard to read.">
        <ul className="divide-y divide-border-default">
          {TYPE.map(([n, c, m]) => (
            <li key={n} className="flex items-baseline justify-between gap-4 py-3">
              <span className={`${c} ${n.startsWith("Body") || n === "Caption" ? "font-sans" : "font-display"} text-ink`}>{n === "Display" ? "Turn views into decisions" : n}</span>
              <span className="mono shrink-0 text-xs text-slate-600">{m}</span>
            </li>
          ))}
        </ul>
        <p className="mono mt-4 text-sm text-ink">Pearson r = 0.83, n = 42, 79,455 views</p>
      </Section>

      <Section id="geometry" title="Spacing, shape and elevation" note="4px base unit. Radius: 8 small, 10 controls, 16 cards. Structure comes from space and 1px lines. Shadow is for overlays only.">
        <div className="flex flex-wrap items-end gap-6">
          {[4, 8, 12, 16, 24, 32, 48].map((n) => <div key={n} className="text-center"><div className="bg-ink/80" style={{ width: n, height: n }} /><p className="mono mt-1 text-xs text-slate-600">{n}</p></div>)}
          {[["8", "rounded-lg"], ["10", "rounded-xl"], ["16", "rounded-2xl"], ["full", "rounded-full"]].map(([n, c]) => <div key={n} className={`surface h-14 w-20 ${c} grid place-items-center text-xs text-slate-600`}>{n}</div>)}
          <div className="overlay grid h-14 w-28 place-items-center rounded-2xl text-xs text-slate-600">overlay</div>
        </div>
      </Section>

      <Section id="components" title="Components" note="Every control shows default, hover, focus, active, selected and disabled states from the same classes.">
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary min-h-11 rounded-xl px-5">Primary</button>
          <button className="ctl min-h-11 rounded-xl px-5 font-semibold">Secondary</button>
          <button className="ctl is-selected min-h-11 rounded-xl px-5 font-semibold">Selected</button>
          <button className="btn-primary min-h-11 rounded-xl px-5" disabled>Disabled</button>
          <span className="chip px-3 py-1 text-sm">Badge</span>
          <button className="ctl inline-flex min-h-11 min-w-11 items-center justify-center rounded-full" aria-label="Copy"><Icon name="copy" /></button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="surface rounded-2xl p-4"><p className="font-display font-semibold text-ink">Surface</p><p className="text-sm text-slate-600">White, 1px line, tiny shadow.</p></div>
          <div className="well rounded-2xl p-4"><p className="font-display font-semibold text-ink">Well</p><p className="text-sm text-slate-600">Inset group inside a surface.</p></div>
          <div className="overlay rounded-2xl p-4"><p className="font-display font-semibold text-ink">Overlay</p><p className="text-sm text-slate-600">Chat, menus, dialogs.</p></div>
        </div>
      </Section>

      <Section id="icons" title="Icons" note="One family: rounded outline, 24px grid, 1.75px stroke, round caps. Decorative icons are hidden from screen readers; stand-alone icons get a label.">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9">
          {(Object.keys(ICONS) as IconName[]).map((n) => <li key={n} className="well grid place-items-center gap-1 rounded-xl p-3 text-ink"><Icon name={n} size="lg" /><span className="text-xs text-slate-600">{n}</span></li>)}
        </ul>
      </Section>

      <Section id="patterns" title="Patterns" note="Patterns derived from the logo and the dark interface: rings, dot grid, lens tile. Low opacity, cropped by the container, never behind body text. The hero backdrop (the logo bars as a blueprint outline on a fading dot grid) is its own piece.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface relative h-44 overflow-hidden rounded-2xl text-ink"><RingsPattern className="absolute -right-10 -top-10 w-64" /><p className="relative p-4 font-display font-semibold">Rings</p></div>
          <div className="surface relative h-44 overflow-hidden rounded-2xl text-ink"><DotGrid className="absolute inset-0" /><p className="relative p-4 font-display font-semibold">Dot grid</p></div>
          <div className="surface relative h-44 overflow-hidden rounded-2xl text-ink"><LensTile className="absolute inset-0" /><p className="relative p-4 font-display font-semibold">Lens tile</p></div>
        </div>
      </Section>

      <Section id="illustrations" title="Illustrations" note="Flat geometric, palette only, no text inside the artwork. Used for welcome, upload, processing, empty, success, error and chat moments.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(Illustrations) as IllustrationName[]).map((n) => <li key={n} className="well rounded-2xl p-3">{Illustrations[n]("h-28 w-full")}<p className="mt-1 text-center text-xs text-slate-600">{n}</p></li>)}
        </ul>
      </Section>

      <Section id="motion" title="Motion: measure, then reflect" note="Entrances ease out, exits are about 20% shorter, no bounce in everyday UI. Only transform and opacity move. Reduced motion removes movement and keeps every state change visible.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="surface rounded-2xl p-5">
            <p className="font-display font-semibold text-ink">Loading screen (1.5s)</p>
            <div className="mt-3 grid place-items-center"><AnimatedMark key={replay} size={96} mode="reveal" /></div>
            <button className="ctl mt-3 min-h-11 w-full rounded-xl font-semibold" onClick={() => setReplay((n) => n + 1)}>Replay</button>
          </div>
          <div className="surface rounded-2xl p-5">
            <p className="font-display font-semibold text-ink">Loader (level meter)</p>
            <div className="mt-3 grid place-items-center"><AnimatedMark size={96} mode="loop" /></div>
            <p className="mt-3 text-sm text-slate-600">Used only while real work is happening.</p>
          </div>
          <div className="surface rounded-2xl p-5">
            <p className="font-display font-semibold text-ink">Easing</p>
            <ul className="mt-3 space-y-2">
              {EASINGS.map(([n, v, use]) => (
                <li key={n}>
                  <div className="well h-6 w-[280px] max-w-full overflow-hidden rounded-full p-1"><div className="h-4 w-4 rounded-full bg-ink" style={{ transform: slide ? "translateX(240px)" : "none", transition: `transform 900ms var(${v})` }} /></div>
                  <p className="mt-1 text-xs text-slate-600"><span className="mono">{n}</span> {use}</p>
                </li>
              ))}
            </ul>
            <button className="ctl mt-3 min-h-11 w-full rounded-xl font-semibold" onClick={() => setSlide((s) => !s)}>Compare</button>
          </div>
        </div>
        <table className="mt-6 w-full text-left text-sm">
          <thead><tr className="text-slate-600"><th className="py-2">Token</th><th>Duration</th><th>Used for</th></tr></thead>
          <tbody className="divide-y divide-border-default">
            {DURATIONS.map(([n, ms, use]) => <tr key={n}><td className="mono py-2">--motion-{n}</td><td>{ms}ms</td><td className="text-slate-700">{use}</td></tr>)}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
