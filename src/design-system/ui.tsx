/* Shared interface pieces. Everything is built from the classes in index.css and the tokens in tokens/speculara.json.
   Rule: line, not box. Cards are white with a hairline; nested groups use `.panel` (line only, no fill). */
import type { ReactNode } from "react";
import { calculationLabel } from "../analysis";
import { RollingNumber, isRollable } from "./RollingNumber";

export function Card({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <section aria-label={label} className={`surface rounded-2xl p-5 sm:p-6 ${className}`}>
      {children}
    </section>
  );
}

/** Nested group inside a card: a hairline outline, never a filled box. */
export const Well = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`panel rounded-2xl p-4 sm:p-5 ${className}`}>{children}</div>
);

export const H = ({ children, sub }: { children: ReactNode; sub?: string }) => (
  <div className="mb-4">
    <h3 className="font-display text-3xl text-ink">{children}</h3>
    {sub && <p className="mt-0.5 text-sm text-slate-600">{sub}</p>}
  </div>
);

/** A labelled fact: small muted label, plain sentence. Replaces "Label: text" runs. */
export function Fact({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</dt>
      <dd className="mt-1 break-words leading-6 text-slate-800">{children}</dd>
    </div>
  );
}

/** A key number: big tabular figure, small label, quiet note. */
export function KeyNumber({ label, value, note, muted = false }: { label: string; value: ReactNode; note?: string; muted?: boolean }) {
  return (
    <div className="tabular min-w-0 border-t border-border-default pt-3">
      <dt className="text-sm font-semibold text-ink">{label}</dt>
      <dd className={muted ? "mt-1 font-sans text-xl font-medium leading-tight text-slate-600" : "mt-1 font-sans text-3xl font-semibold leading-tight tracking-tight text-ink [overflow-wrap:anywhere] sm:text-4xl"}>{isRollable(value) ? <RollingNumber value={value} /> : value}</dd>
      {note && <dd className="mt-1 text-sm text-slate-600">{note}</dd>}
    </div>
  );
}

export function Numbers({ children }: { children: ReactNode }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2 font-semibold text-ink">
        See the numbers
      </summary>
      <div className="mt-3 space-y-3 text-slate-700">{children}</div>
    </details>
  );
}

export function Pills<T extends string>({ items, value, onChange }: { items: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-1 flex flex-wrap gap-2 p-2 sm:gap-3" role="group" aria-label="Analysis options">
      {items.map((i) => (
        <button
          key={i}
          aria-pressed={i === value}
          onClick={() => onChange(i)}
          className={`min-h-[var(--size-target)] min-w-[var(--size-target)] max-w-full rounded-full px-4 py-2 text-sm ${i === value ? "ctl is-selected font-semibold" : "ctl text-slate-600 hover:text-ink"}`}
        >
          {i === "post_id" ? "Post" : calculationLabel(i)}
        </button>
      ))}
    </div>
  );
}
