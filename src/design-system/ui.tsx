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
    <details className="group panel mt-4 rounded-2xl text-sm">
      <summary className="flex min-h-[var(--size-target)] cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-2 font-semibold text-ink [&::-webkit-details-marker]:hidden">
        See the numbers
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="space-y-6 border-t border-border-default px-4 py-4 text-slate-700">{children}</div>
    </details>
  );
}

/** Small heading for a block inside "See the numbers". */
export function SubHead({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <div className="mb-2">
      <h4 className="font-sans text-base font-semibold text-ink">{children}</h4>
      {note && <p className="mt-0.5 text-xs text-slate-600">{note}</p>}
    </div>
  );
}

/** Label and value pairs in a tidy grid, for facts such as dates, counts and methods. */
export function FactGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="tabular grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((i) => (
        <Fact key={i.label} label={i.label}>
          {i.value}
        </Fact>
      ))}
    </dl>
  );
}

/** Plain table for evidence. First column is the row header; other columns align right (numbers). */
export function DataTable({
  columns,
  rows,
  highlightRow,
}: {
  columns: string[];
  rows: ReactNode[][];
  highlightRow?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="tabular w-full min-w-[18rem] text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            {columns.map((c, i) => (
              <th key={c} scope="col" className={`py-2 ${i === 0 ? "pr-4" : "px-3 text-right"}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr
              key={ri}
              className={`border-t border-border-default ${ri === highlightRow ? "font-semibold text-ink" : ""}`}
            >
              {r.map((cell, ci) =>
                ci === 0 ? (
                  <th key={ci} scope="row" className="py-2 pr-4 font-semibold text-ink">
                    {cell}
                  </th>
                ) : (
                  <td key={ci} className="px-3 py-2 text-right">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Short caveats as a quiet bulleted list. */
export function NoteList({ items }: { items: string[] }) {
  const clean = items.filter(Boolean);
  if (!clean.length) return null;
  return (
    <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
      {clean.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
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
