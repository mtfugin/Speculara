/* Each module shows its data in its own way, so the six cards do not read as one template.
   Colors are meaning, not decoration: green is positive, wine is caution, snow and orange are everything else. */
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../design-system/Icon";
import { FitText } from "./collected";

/* ---------- Header: icon chip, title, one line of purpose, and a hairline accent that is the module's own ---------- */
const ACCENT: Record<string, string> = {
  predict: "var(--color-orange)",
  recommend: "#ffd60a",
  charts: "var(--color-snow)",
  correlation: "#ea580c",
  sentiment: "#30d158",
  demand: "#ff9f0a",
};

export function ModuleTitle({ module, sub, children }: { module: string; sub: string; children: ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-ink"
        style={{ background: `color-mix(in srgb, ${ACCENT[module]} 16%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${ACCENT[module]} 40%, transparent)` }}
      >
        <Icon name={module as IconName} size="lg" />
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-3xl leading-tight text-ink">{children}</h3>
        <p className="mt-0.5 text-sm text-slate-600">{sub}</p>
      </div>
    </div>
  );
}

/* ---------- Sentiment: one stacked bar for the whole conversation, then the words people actually used ---------- */
export function SentimentBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  const parts = [
    { key: "positive", label: "Positive", color: "#30d158" },
    { key: "neutral", label: "Neutral", color: "rgb(161 161 166 / 0.55)" },
    { key: "negative", label: "Negative", color: "#ff453a" },
  ];
  return (
    <div>
      <div
        role="img"
        aria-label={parts.map((p) => `${p.label} ${((counts[p.key] / total) * 100).toFixed(1)}%`).join(", ")}
        className="flex h-5 w-full overflow-hidden rounded-full bg-ink/10"
      >
        {parts.map((p) => {
          const share = (counts[p.key] / total) * 100;
          return share > 0 ? <span key={p.key} style={{ width: `${share}%`, background: p.color }} className="h-full first:rounded-l-full last:rounded-r-full" /> : null;
        })}
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3">
        {parts.map((p) => (
          <li key={p.key} className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-slate-700">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
              {p.label}
            </p>
            <p className="mt-1 font-sans text-3xl font-semibold tabular text-ink">
              <FitText>{`${((counts[p.key] / total) * 100).toFixed(1)}%`}</FitText>
            </p>
            <p className="text-xs text-slate-600 tabular">{counts[p.key].toLocaleString()} {counts[p.key] === 1 ? "comment" : "comments"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function WordChips({ words }: { words: { word: string; count: number }[] }) {
  const max = Math.max(1, ...words.map((w) => w.count));
  return (
    <ul className="flex flex-wrap items-baseline gap-x-3 gap-y-2" aria-label="Words people used most">
      {words.map((w) => {
        const weight = w.count / max;
        return (
          <li key={w.word} className="inline-flex items-baseline gap-1.5 rounded-full bg-ink/[0.07] px-3 py-1" style={{ fontSize: `${0.85 + weight * 0.9}rem`, fontWeight: weight > 0.7 ? 700 : weight > 0.4 ? 600 : 500 }}>
            <span className="text-ink">{w.word}</span>
            <span className="text-xs font-normal tabular text-slate-600">{w.count}</span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- Demand: how much of the conversation is asking, and how much is asking for more ---------- */
export function SignalBar({ icon, label, value, of, note }: { icon: IconName; label: string; value: number; of: number; note: string }) {
  const share = of > 0 ? Math.min(100, (value / of) * 100) : 0;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <li className="rounded-2xl bg-ink/[0.06] p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink/10 text-ink">
          <Icon name={icon} size="md" />
        </span>
        <p className="min-w-0 flex-1 text-sm font-semibold text-ink">{label}</p>
        <p className="font-sans text-2xl font-semibold tabular text-ink">{value.toLocaleString()}</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-ink/10" role="img" aria-label={`${share.toFixed(0)} percent of ${of.toLocaleString()} text entries`}>
        <span className="block h-full rounded-full bg-orange-fill transition-[width] duration-700 ease-out" style={{ width: on ? `${share}%` : "0%" }} />
      </div>
      <p className="mt-2 text-xs text-slate-600">
        <strong className="font-semibold text-ink tabular">{share.toFixed(0)}%</strong> of {of.toLocaleString()} text entries. {note}
      </p>
    </li>
  );
}

/* ---------- Predict: the number first, large, with where it points ---------- */
export function ForecastHero({ metric, date, value, last }: { metric: string; date: string; value: string; last?: number | null }) {
  return (
    <div className="rounded-3xl p-5 sm:p-6" style={{ background: "radial-gradient(120% 120% at 0% 0%, rgb(255 159 10 / 0.16), transparent 60%), rgb(245 245 247 / 0.04)", boxShadow: "inset 0 0 0 1px rgb(255 159 10 / 0.3)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {metric} estimated for {date}
      </p>
      <p className="mt-2 font-sans text-5xl font-semibold leading-none tracking-tight tabular text-ink sm:text-6xl">
        <FitText>{value}</FitText>
      </p>
      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
        <Icon name="warning" size="sm" />
        <span>
          An <strong className="font-bold text-ink underline decoration-orange/60 decoration-2 underline-offset-4">estimate, not a guarantee</strong>.
        </span>
        {last != null && <span className="text-slate-600">Last observed day: {last.toLocaleString()}.</span>}
      </p>
    </div>
  );
}
