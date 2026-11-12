import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  answer,
  plainChat,
  analysisReport,
  download,
  ratioText,
  periodText,
  relationshipSummary,
  friendlyUnavailable,
  calculationLabel,
  decisionBrief,
  funnelStages,
  safePostUrl,
  FUNNEL_NOTE,
  experimentMetric,
  type Analysis,
  type Metric,
} from "./analysis";

import { chartTicks, niceMax } from "./chart-presentation";
import { Logo } from "./design-system/Logo";
import { Icon } from "./design-system/Icon";
import { Illustration } from "./design-system/illustrations";
import { Splash } from "./design-system/Splash";
import { AnalysisLoader } from "./design-system/AnalysisLoader";
import { Card, Fact, H, KeyNumber, Numbers, Pills, Well } from "./design-system/ui";
import ResponsiveHeroBanner from "./components/ui/responsive-hero-banner";

import { moduleInfo, updatedLabel, priorityLabel, type ModuleKey } from "./polish";

type Key = ModuleKey;

const INK = "var(--color-ink)",
  SKY = "var(--color-sky)",
  CREAM = "var(--color-cream)",
  WINE = "var(--color-wine)";

const META: Record<Key, { q: string; title: string; tab: string }> = {
  predict: { q: "What do you want to Predict?", title: "Prediction", tab: "Predict" },
  recommend: {
    q: "What do you want to find recommendation of?",
    title: "Recommendation",
    tab: "Recommend",
  },
  charts: { q: "What do you want to get charts of?", title: "Charts", tab: "Charts" },
  correlation: {
    q: "What do you want to get correlation of?",
    title: "Correlation",
    tab: "Correlation",
  },
  sentiment: { q: "What do you want to get sentiment of?", title: "Sentiment", tab: "Sentiment" },
  demand: { q: "What do you want to get demand of?", title: "Demand", tab: "Demand" },
};
const ORDER = Object.keys(META) as Key[];

const Results = createContext<Analysis | null>(null);
function useAnalysis() {
  return useContext(Results)!;
}

function StatusBadge({ module, analysis }: { module: Key; analysis: Analysis | null }) {
  const status = moduleInfo(module, analysis).status;
  return (
    <span
      aria-label={`${META[module].tab} status: ${status}`}
      className="inline-block rounded-full bg-ink/10 px-2.5 py-1 text-xs font-semibold text-ink"
    >
      {status}
    </span>
  );
}
function ModuleBrief({ module }: { module: Key }) {
  const analysis = useAnalysis();
  const info = moduleInfo(module, analysis);
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);
  const copy = async () => {
    setCopying(true);
    setMessage("");
    try {
      const label =
        analysis.source_kind === "synthetic"
          ? "Synthetic demo (fictional records)"
          : "Uploaded dataset";
      await navigator.clipboard.writeText(`${label}\n${info.finding}`);
      setMessage("Finding copied.");
    } catch {
      setMessage("Copy was blocked. Select the finding and copy it manually.");
    } finally {
      setCopying(false);
    }
  };
  return (
    <div className="mb-5 space-y-3">
      <StatusBadge module={module} analysis={analysis} />
      <p data-testid="module-takeaway" className="font-medium text-ink">
        {info.finding}
      </p>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <button
          type="button"
          aria-label={`Copy ${META[module].tab} finding`}
          disabled={copying}
          onClick={() => void copy()}
          className="ctl min-h-11 rounded-xl px-3 text-sm text-ink"
        >
          {copying ? "Copying..." : "Copy finding"}
        </button>
        <details className="min-w-0 text-sm">
          <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2 font-semibold text-ink">
            Why this matters
          </summary>
          <p className="max-w-prose pb-2 text-slate-700">{info.why}</p>
        </details>
      </div>
      <p role="status" className="text-sm text-slate-700">
        {message}
      </p>
    </div>
  );
}
function UpdatedAt({ at }: { at: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [at]);
  return (
    <p className="mt-2 text-sm text-slate-700">
      <time dateTime={new Date(at).toISOString()} title={new Date(at).toLocaleString()}>
        {updatedLabel(at, now)}
      </time>
      <span className="text-slate-600"> · analysis of this file</span>
    </p>
  );
}

/* ---------- primitives ---------- */

function Query({
  label,
  value,
  onChange,
  cta,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  cta: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <form
      className="well flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-center sm:pl-4"
      onSubmit={(e) => {
        e.preventDefault();
        onChange(draft.trim() || value);
      }}
    >
      <label className="shrink-0 px-2 pt-1 text-sm text-slate-600 sm:p-0">{label}</label>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-[var(--size-target)] min-w-0 flex-1 bg-transparent px-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      />
      <button className="btn-primary min-h-11 rounded-xl px-5 py-2.5 text-sm font-medium">
        {cta}
      </button>
    </form>
  );
}

const Explain = ({ children }: { children: ReactNode }) => (
  <div className="pt-5 text-sm">
    <p className="font-semibold text-ink">What this shows</p>
    <p className="mt-1 text-slate-600">{children}</p>
  </div>
);

const Stat = ({ l, v, c = INK }: { l: string; v: string | number; c?: string }) => (
  <div className="panel tabular rounded-2xl p-4">
    <p className="font-sans text-3xl font-semibold leading-tight tracking-tight [overflow-wrap:anywhere] sm:text-4xl" style={{ color: c }}>
      {v}
    </p>
    <p className="mt-1 text-sm text-slate-600">{l}</p>
  </div>
);

/* diverging bar: left vs right share */
const Split = ({
  l,
  r,
  lv,
  ll,
  rl,
}: {
  l: string;
  r?: string;
  lv: number;
  ll: string;
  rl: string;
}) => (
  <div className="mb-3">
    <div className="mb-1 flex justify-between text-xs text-slate-600">
      <span>
        {ll} {lv}%
      </span>
      <span>
        {rl} {100 - lv}%
      </span>
    </div>
    <div className="well flex h-3 overflow-hidden rounded-full">
      <i style={{ width: `${lv}%`, background: l }} />
      <i style={{ width: `${100 - lv}%`, background: r ?? WINE }} />
    </div>
  </div>
);

/* Bar chart with axis, gridlines, value labels and optional average line */
function BarChart({
  values,
  labels,
  max,
  fmt,
  avg,
  label,
  dateLabels = false,
}: {
  values: number[];
  labels: string[];
  max: number;
  fmt: (v: number) => string;
  avg?: boolean;
  label: string;
  dateLabels?: boolean;
}) {
  const plot = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    if (plot.current) observer.observe(plot.current);
    return () => observer.disconnect();
  }, []);
  const ticks = chartTicks(labels, dateLabels, width);
  const top = Math.max(...values),
    mean = values.reduce((a, b) => a + b, 0) / values.length;
  const many = values.length > 8;
  return (
    <div
      role="img"
      aria-label={`${label}. Highest ${labels[values.indexOf(top)]}: ${fmt(top)}. ${labels.map((l, i) => `${l}: ${values[i]}`).join("; ")}`}
      className="tabular"
      style={{ fontSize: "var(--font-size-chart-label)" }}
    >
      <div className="flex gap-2">
        <div className="flex h-44 w-16 shrink-0 flex-col justify-between pb-0 text-right leading-none text-slate-600">
          {[1, 0.75, 0.5, 0.25, 0].map((t) => (
            <span key={t}>{fmt(max * t)}</span>
          ))}
        </div>
        <div ref={plot} className="relative h-44 min-w-0 flex-1">
          {[0, 25, 50, 75, 100].map((t) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t"
              style={{ bottom: `${t}%`, borderColor: "var(--color-chart-grid)" }}
            />
          ))}
          <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2.5">
            {values.map((v, i) => (
              <div
                key={i}
                data-chart-bar
                title={`${labels[i]}: ${v}`}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              >
                <span
                  className={`mb-1 rounded bg-card/90 px-1 font-semibold text-ink ${!many || i === values.indexOf(top) ? "" : "pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100"}`}
                >
                  {fmt(v)}
                </span>
                <div
                  className="bar-grow w-full rounded-t-lg transition-[filter] duration-150 group-hover:brightness-90"
                  style={{
                    ["--i" as string]: i,
                    height: `${(v / max) * 100}%`,
                    background:
                      i === values.indexOf(top)
                        ? `linear-gradient(180deg,var(--color-action-primary-start),var(--color-chart-primary))`
                        : "var(--color-chart-secondary)",
                                      }}
                />
              </div>
            ))}
          </div>
          {avg && (
            <div
              className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed"
              style={{ bottom: `${(mean / max) * 100}%`, borderColor: WINE }}
            >
              <span className="absolute -top-5 right-0 rounded bg-card px-1 font-semibold text-wine">
                avg {fmt(mean)}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-1.5 flex gap-2">
        <span className="w-16 shrink-0" />
        <div className="relative h-6 min-w-0 flex-1">
          {ticks.map(({ index, text }, tick) => (
            <span
              key={index}
              data-chart-tick
              title={labels[index]}
              className="absolute block truncate whitespace-nowrap text-slate-600"
              style={{
                left: `${ticks.length === 1 ? 0 : (tick / (ticks.length - 1)) * 100}%`,
                transform:
                  tick === 0
                    ? undefined
                    : tick === ticks.length - 1
                      ? "translateX(-100%)"
                      : "translateX(-50%)",
                maxWidth: `${100 / ticks.length}%`,
              }}
            >
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Dataset-driven analytical modules ---------- */
const number = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 2 });
function Unavailable({ children }: { children: ReactNode }) {
  return (
    <Well>
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <Illustration name="needsData" className="h-24 w-36 shrink-0" />
        <div>
          <p className="font-display text-2xl text-ink">A little more data will help</p>
          <p className="mt-1 text-sm text-slate-700">{children}</p>
        </div>
      </div>
    </Well>
  );
}
function Predict() {
  const analysis = useAnalysis();
  const f = analysis.predict;
  return (
    <Card label="Predict results">
      <H sub="A guide to what might happen next.">Predict</H>
      <ModuleBrief module="predict" />
      {f.available ? (
        <>
          <Stat
            l={`${calculationLabel(f.metric)} estimated for ${f.points[0].label}`}
            v={number(f.points[0].value)}
          />
          <p className="mt-3 text-sm text-slate-700">An estimate, not a guarantee.</p>
          <p className="mt-2 text-sm text-slate-700">
            Use this as a starting point, then check what happens.
          </p>
          <Well className="mt-4">
            <H>Next seven days</H>
            <BarChart
              values={f.points.map((p) => p.value)}
              labels={f.points.map((p) => p.label)}
              dateLabels
              max={niceMax(Math.max(1, ...f.points.map((p) => p.value)))}
              fmt={(v) =>
                new Intl.NumberFormat(undefined, {
                  notation: "compact",
                  maximumFractionDigits: 1,
                }).format(v)
              }
              label={`${f.metric} daily estimate`}
            />
          </Well>
          <Numbers>
            <H>Model comparison</H>
            <p>
              Selected model: {f.selected_model}. Holdout dates:{" "}
              {f.evaluation.holdout_dates.join(", ")}. Training dates before holdout:{" "}
              {f.evaluation.train_days}.
            </p>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">MAE ({f.metric} count units)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(f.evaluation.scores).map(([model, score]) => (
                  <tr key={model}>
                    <th scope="row">{model}</th>
                    <td>{number(score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              Held-out three-day MAE: {number(f.mae)} {f.metric}. {f.method} {f.notes.join(" ")}
            </p>
            <ul>
              {f.points.map((p) => (
                <li key={p.label}>
                  {p.label}: {number(p.value)}
                </li>
              ))}
            </ul>
          </Numbers>
        </>
      ) : (
        <>
          <Numbers>{f.reason}</Numbers>
        </>
      )}
    </Card>
  );
}
function DecisionOverview() {
  const a = useAnalysis();
  const brief = decisionBrief(a);
  const references = (a.post_references ?? []).slice(0, 365).filter((r) => safePostUrl(r.post_url));
  return (
    <div className="mb-8 space-y-6">
      <Card label="Decision brief">
        <H sub="Start with the evidence, then choose one small test.">Your decision brief</H>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">What changed</p>
        <p className="mt-1 break-words font-sans text-2xl font-medium leading-snug tracking-tight text-ink sm:text-3xl">
          {brief.changed}
        </p>
        <dl className="mt-6 grid gap-x-8 gap-y-5 border-t border-border-default pt-5 sm:grid-cols-3">
          <Fact label="Why it matters">{brief.matters}</Fact>
          <Fact label="Try next">{brief.try_next}</Fact>
          <Fact label="How to measure">{brief.measure}</Fact>
        </dl>
      </Card>
      <Card label="Independent counts">
        <H sub="Attention, interest, questions and purchases recorded in this file.">
          Independent counts
        </H>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {funnelStages(a).map((stage) => (
            <KeyNumber
              key={stage.key}
              label={stage.label}
              value={stage.value == null ? "Not supplied" : stage.value.toLocaleString()}
              muted={stage.value == null}
              note={stage.note}
            />
          ))}
        </dl>
        <p className="mt-5 text-sm text-slate-600">{a.funnel?.note ?? FUNNEL_NOTE}</p>
        {references.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2 font-semibold text-ink">
              Post references
            </summary>
            <p className="text-slate-700">
              Supplied links are references, not verified platform connections.
            </p>
            <ul className="mt-2 space-y-2">
              {references.map((r, index) => (
                <li key={index}>
                  <a
                    href={safePostUrl(r.post_url)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center break-all rounded-lg py-2 text-ink underline"
                  >
                    {r.post_id ? `Post ${r.post_id}` : `Supplied post link ${index + 1}`} (opens in
                    new tab)
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Card>
    </div>
  );
}
function RecommendationItem({
  item,
  index,
}: {
  item: Analysis["recommend"][number];
  index: number;
}) {
  return (
    <li className="panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-neutral-900" aria-hidden="true">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="chip inline-block px-2.5 py-0.5 text-xs">{priorityLabel(index)}</p>
          <h4 className="mt-1 font-sans text-lg font-semibold leading-snug text-ink">{item.title}</h4>
        </div>
      </div>
      <dl className="mt-4 space-y-3 sm:ml-11">
        <Fact label="Evidence">{item.evidence}</Fact>
        <Fact label="Try this">{item.action}</Fact>
        <Fact label="How to measure">{experimentMetric(item)}</Fact>
      </dl>
      {item.post_id && (
        <p className="mt-3 break-all text-sm text-slate-700">Post ID {item.post_id}</p>
      )}
      {safePostUrl(item.post_url) && (
        <a
          href={safePostUrl(item.post_url)!}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex min-h-11 items-center rounded-lg py-2 text-sm text-ink underline"
        >
          View supplied post (opens in new tab)
        </a>
      )}
      {item.details && <Numbers>{item.details}</Numbers>}
    </li>
  );
}
function Recommend() {
  const a = useAnalysis();
  return (
    <Card label="Recommendations results">
      <H sub="Small steps you can test, based on your data.">Your next decisions</H>
      <ModuleBrief module="recommend" />
      <p className="mb-3 text-sm text-slate-600">Suggested order to try, not predicted impact.</p>
      <ol className="space-y-4">
        {a.recommend.slice(0, 3).map((item, index) => (
          <RecommendationItem key={item.title} item={item} index={index} />
        ))}
      </ol>
      {a.recommend.length > 3 && (
        <details className="mt-4 text-sm">
          <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2 font-semibold text-ink">
            More ideas
          </summary>
          <ol start={4} className="mt-3 space-y-4">
            {a.recommend.slice(3).map((item, index) => (
              <RecommendationItem key={item.title} item={item} index={index + 3} />
            ))}
          </ol>
        </details>
      )}
      <p className="mt-4 text-sm text-slate-600">Try one change at a time and check the results.</p>
    </Card>
  );
}
function Calculations({ kind }: { kind: "charts" | "periods" }) {
  const a = useAnalysis();
  if (kind === "periods")
    return (
      <Well className="mt-4">
        <H>Period comparisons</H>
        <p className="text-sm whitespace-pre-line">
          {Object.entries(a.periods)
            .map(([metric, p]) => periodText(metric, p!))
            .join("\n") ||
            "Period comparisons unavailable: need dated numeric metrics and all 14 calendar dates."}
        </p>
        <p className="mt-2 text-xs">
          Latest seven UTC calendar dates versus prior seven; missing dates are not zero activity.
        </p>
      </Well>
    );
  return (
    <>
      <Well className="mt-4">
        <H>Ratios</H>
        {Object.entries(a.ratios).map(([k, r]) => (
          <p className="mb-3 text-sm" key={k}>
            {ratioText(k, r)}
          </p>
        ))}
      </Well>
      <Well className="mt-4">
        <H>Rankings</H>
        <p className="mb-3 text-xs">
          Categories: 3 complete positive-view rows and 1,000 views. Posts: unique nonblank IDs and
          at least 100 views. Exposure heuristics, not statistical significance. Top 10 by rate,
          then label.
        </p>
        {Object.entries(a.rankings).flatMap(([g, rs]) =>
          Object.entries(rs).map(([k, r]) => (
            <div key={g + k} className="mb-4">
              <h4 className="font-semibold">
                {calculationLabel(g)}: {k.replace(/_/g, " ")}
              </h4>
              {!r.available ? (
                <p className="text-sm">{r.reason}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr>
                        {["Label", "Numerator (count)", "Views", "Rate (%)", "Complete rows"].map(
                          (h) => (
                            <th scope="col" key={h}>
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {r.rows.map((x) => (
                        <tr key={x.label}>
                          <th scope="row">{x.label}</th>
                          <td>{number(x.numerator)}</td>
                          <td>{number(x.views)}</td>
                          <td>{x.percent.toFixed(2)}</td>
                          <td>{x.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs">{r.excluded_groups} excluded groups.</p>
            </div>
          )),
        )}
      </Well>
    </>
  );
}
function Charts() {
  const a = useAnalysis();
  const [metric, setMetric] = useState<Metric>(a.metrics[0] ?? "views");
  const groups = Object.keys(a.charts);
  const [group, setGroup] = useState(groups[0] ?? "");
  const rows = (a.charts[group] ?? []).filter((r) => r[metric] != null);
  const pageSize = 12;
  const [page, setPage] = useState(0);
  const shown = rows.slice(page * pageSize, (page + 1) * pageSize);
  return (
    <Card label="Charts results">
      <H sub="See how your numbers compare.">Charts</H>
      <ModuleBrief module="charts" />
      {!a.metrics.length ? (
        <p className="text-sm text-slate-700">No chart is available yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(a.metrics.filter((m) => ["views", "saves", "sales"].includes(m)).length
              ? a.metrics.filter((m) => ["views", "saves", "sales"].includes(m))
              : a.metrics.slice(0, 3)
            ).map((m) => (
              <Stat key={m} l={`Total ${m}`} v={number(a.totals[m]!)} />
            ))}
          </div>
          <Pills
            items={a.metrics}
            value={metric}
            onChange={(m) => {
              setMetric(m);
              setPage(0);
            }}
          />
          {groups.length ? (
            <>
              <Pills
                items={groups}
                value={group}
                onChange={(g) => {
                  setGroup(g);
                  setPage(0);
                }}
              />
              {shown.length ? (
                <Well>
                  <H
                    sub={`${group}, groups ${page * pageSize + 1} to ${Math.min((page + 1) * pageSize, rows.length)} of ${rows.length}`}
                  >
                    {metric}
                  </H>
                  <BarChart
                    values={shown.map((r) => r[metric]!)}
                    labels={shown.map((r) => r.label)}
                    dateLabels={group === "date"}
                    max={niceMax(Math.max(1, ...shown.map((r) => r[metric]!)))}
                    fmt={(v) =>
                      new Intl.NumberFormat(undefined, {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(v)
                    }
                    label={`${metric} by ${group}`}
                  />
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pr-16">
                    <button
                      className="ctl min-h-11 rounded-xl px-4"
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </button>
                    <span className="text-sm">
                      Page {page + 1} of {Math.max(1, Math.ceil(rows.length / pageSize))}
                    </span>
                    <button
                      className="ctl min-h-11 rounded-xl px-4"
                      disabled={(page + 1) * pageSize >= rows.length}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                  <details className="mt-4 text-sm">
                    <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2">
                      View exact chart data
                    </summary>
                    <div className="overflow-x-auto">
                      <table className="mt-2 w-full text-left">
                        <thead>
                          <tr>
                            <th scope="col">{group}</th>
                            <th scope="col">{metric}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shown.map((r) => (
                            <tr key={r.label}>
                              <th scope="row" className="py-1 font-normal">
                                {r.label}
                              </th>
                              <td>{number(r[metric]!)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </Well>
              ) : (
                <Unavailable>Add {metric} counts to compare these groups.</Unavailable>
              )}
            </>
          ) : (
            <Unavailable>
              Add dates or category names to compare your entries. Your totals are shown above.
            </Unavailable>
          )}
        </>
      )}
      <Numbers>
        <Calculations kind="charts" />
        <p>
          Each chart starts at zero. Date groups are daily UTC totals. Blank counts are excluded.
        </p>
      </Numbers>
    </Card>
  );
}
/* Strength meter (0 to 3 steps) and direction icon; always paired with words, never color alone. */
const DIRECTION_TEXT: Record<string, string> = {
  "Move together": "Rise and fall together",
  "Move in opposite directions": "One rises as the other falls",
  "No clear pattern": "No link found",
};
function strengthSteps(r: number) {
  const m = Math.abs(r);
  return m < 0.3 ? 0 : m < 0.5 ? 1 : m < 0.7 ? 2 : 3;
}
function StrengthMeter({ steps, label }: { steps: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span role="img" aria-label={`Strength ${steps} of 3`} className="inline-flex gap-1">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-2.5 w-6 rounded-full border border-ink/40"
            style={{ background: i <= steps ? "var(--color-ink)" : "transparent" }}
          />
        ))}
      </span>
      <span className="text-sm font-semibold text-slate-700">{label}</span>
    </span>
  );
}
function DirectionIcon({ r }: { r: number }) {
  const flat = Math.abs(r) < 0.3;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {flat ? (
        <path d="M5 12h14" />
      ) : r < 0 ? (
        <>
          <path d="M7 7l10 10" />
          <path d="M17 8v9H8" />
        </>
      ) : (
        <>
          <path d="M7 17L17 7" />
          <path d="M8 7h9v9" />
        </>
      )}
    </svg>
  );
}
function Correlation() {
  const a = useAnalysis();
  const [mode, setMode] = useState("All connections");
  const pairs = a.correlation.filter(
    (p) =>
      mode === "All connections" ||
      (mode === "Strong connections" ? Math.abs(p.r) >= 0.7 : p.r <= -0.3),
  );
  const renderPair = (p: Analysis["correlation"][number], index: number) => {
    const summary = relationshipSummary(p);
    return (
      <li key={p.a + p.b} className="well stagger-in tabular rounded-2xl p-4" style={{ ["--i" as string]: index }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
            <DirectionIcon r={p.r} />
            {DIRECTION_TEXT[summary.direction] ?? summary.direction}
          </span>
          <StrengthMeter steps={strengthSteps(p.r)} label={summary.strength} />
        </div>
        <p className="mt-3 font-sans text-base font-semibold text-ink">{summary.finding}</p>
        <p className="mt-1 text-sm text-slate-600">
          {calculationLabel(p.a)} and {p.b}
        </p>
        {p.n < 10 && (
          <p className="mt-2 inline-block rounded-full bg-ink/10 px-3 py-1 text-sm font-semibold text-ink">
            {summary.note}
          </p>
        )}
        {p.r <= -0.3 && (
          <p className="mt-2 text-sm text-slate-600">Opposite movement is not automatically bad.</p>
        )}
        <Numbers>
          <p>
            Pearson r = {p.r}; unadjusted p = {p.p.toExponential(2)}; Spearman rho = {p.spearman_r};
            unadjusted p = {p.spearman_p.toExponential(2)}; n = {p.n} complete pairs.
          </p>
          <p>
            These statistics describe a pattern, not a cause. Small samples, outliers and repeated
            observations can affect results. P-values are unadjusted.
          </p>
        </Numbers>
      </li>
    );
  };
  return (
    <Card label="Correlation results">
      <H sub="See which numbers tend to change together.">Connections in your data</H>
      <ModuleBrief module="correlation" />
      <Pills
        items={["All connections", "Strong connections", "Opposite movement"]}
        value={mode}
        onChange={setMode}
      />
      {pairs.length ? (
        <>
          <ul className="space-y-3">{pairs.slice(0, 3).map((p, i) => renderPair(p, i))}</ul>
          {pairs.length > 3 && (
            <details className="mt-4 text-sm">
              <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2 font-semibold text-ink">
                More connections
              </summary>
              <ul className="mt-3 space-y-3">{pairs.slice(3).map((p, i) => renderPair(p, i))}</ul>
            </details>
          )}
        </>
      ) : (
        <Unavailable>
          {a.correlation.length
            ? "No connections match this choice. Try All connections."
            : friendlyUnavailable("correlation")}
        </Unavailable>
      )}
      <p className="mt-4 text-sm text-slate-600">
        This pattern doesn’t prove what caused the change.
      </p>
      <p className="mt-2 text-sm text-slate-700">
        Compare the entries before deciding what to change.
      </p>
    </Card>
  );
}
function Sentiment() {
  const s = useAnalysis().sentiment;
  return (
    <Card label="Sentiment results">
      <H sub="Based on a simple word check">How comments sound</H>
      <ModuleBrief module="sentiment" />
      {s.available ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(s.counts!).map(([k, v]) => (
              <Stat
                key={k}
                l={`${calculationLabel(k)} comments`}
                v={`${((v / s.n!) * 100).toFixed(1)}%`}
                c={k === "negative" ? WINE : INK}
              />
            ))}
          </div>
          <p className="mt-3 text-sm text-slate-700">
            Read the comments before deciding how to respond.
          </p>
          <Numbers>
            <p>
              {s.method} Labels describe {s.n} nonempty text entries, not everyone who saw your
              content.
            </p>
            <ul>
              {Object.entries(s.counts!).map(([k, v]) => (
                <li key={k}>
                  {calculationLabel(k)}: {number(v)}
                </li>
              ))}
            </ul>
            <H>Frequent words</H>
            <ul>
              {s.keywords!.map((w) => (
                <li className="flex justify-between gap-3" key={w.word}>
                  <span>{w.word}</span>
                  <b>{w.count}</b>
                </li>
              ))}
            </ul>
          </Numbers>
        </>
      ) : (
        <>
          <Numbers>{s.reason}</Numbers>
        </>
      )}
    </Card>
  );
}
function Demand() {
  const a = useAnalysis(),
    d = a.demand;
  const salesPeriod = a.periods.sales;
  const savesPeriod = a.periods.saves;
  return (
    <Card label="Demand results">
      <H sub="Look at purchases and signs of interest.">Demand</H>
      <ModuleBrief module="demand" />
      {d.available ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {d.sales != null && (
              <Stat
                l={salesPeriod?.available ? "Sales in latest week" : "Sales in your data"}
                v={number(salesPeriod?.available ? salesPeriod.current_total! : d.sales)}
              />
            )}
            {d.saves != null && (
              <Stat
                l={savesPeriod?.available ? "Saves in latest week" : "Saves in your data"}
                v={number(savesPeriod?.available ? savesPeriod.current_total! : d.saves)}
              />
            )}
            {d.inquiries != null && <Stat l="Entries with questions" v={d.inquiries} />}
            {d.requests != null && <Stat l="Entries asking for more" v={d.requests} />}
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Interest doesn’t always turn into a purchase.
          </p>
          <p className="mt-2 text-sm text-slate-700">
            {salesPeriod?.available || savesPeriod?.available
              ? "Compare the entries from each week before deciding what to change."
              : "Review the entries and answer any recurring buying questions."}
          </p>
          <Numbers>
            <Calculations kind="periods" />
            <p>{d.notes?.join(" ")}</p>
            <p>
              Dataset totals: {d.sales == null ? "sales not supplied" : `${number(d.sales)} sales`};{" "}
              {d.saves == null ? "saves not supplied" : `${number(d.saves)} saves`}. Question and
              request counts can overlap and are not unique buyers.
            </p>
          </Numbers>
        </>
      ) : (
        <>
          <Numbers>
            <Calculations kind="periods" />
            {d.reason}
          </Numbers>
        </>
      )}
      {!salesPeriod?.available && !savesPeriod?.available && d.available && (
        <p className="mt-3 text-sm text-slate-700">{friendlyUnavailable("periods")}</p>
      )}
    </Card>
  );
}
const VIEWS: Record<Key, () => ReactNode> = {
  predict: Predict,
  recommend: Recommend,
  charts: Charts,
  correlation: Correlation,
  sentiment: Sentiment,
  demand: Demand,
};

/* ---------- Optional profile link (off unless the server enables it; this computer only) ---------- */
function ProfileLink({
  disabled,
  onAnalyzed,
}: {
  disabled: boolean;
  onAnalyzed: (data: Analysis, label: string) => void;
}) {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  const [enabled, setEnabled] = useState(false);
  const [url, setUrl] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [working, setWorking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(`${base}/api/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => alive && setEnabled(h?.profile === true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [base]);
  if (!enabled) return null;
  const call = async (path: string, body?: unknown, timeout = 30000) => {
    const response = await fetch(`${base}/api/profile/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "That did not work.");
    return data;
  };
  const run = async (task: () => Promise<void>) => {
    setWorking(true);
    setMsg("");
    try {
      await task();
    } catch (e) {
      setMsg(e instanceof Error && e.name !== "TimeoutError" ? e.message : "That took too long. Try again.");
    } finally {
      setWorking(false);
    }
  };
  const busy = disabled || working;
  return (
    <details className="mt-3 text-sm">
      <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2 font-semibold text-ink">
        Analyze a profile link (this computer only)
      </summary>
      <div className="space-y-3 pb-2">
        <p className="text-slate-600">
          Reads public post counts and comments from an Instagram, Facebook or TikTok profile
          through a browser on this computer. You sign in inside the window that opens, not inside
          Speculara. Nothing is saved.
        </p>
        <label className="flex min-h-11 items-start gap-2 text-ink">
          <input
            type="checkbox"
            checked={allowed}
            onChange={(e) => setAllowed(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[var(--color-ink)]"
          />
          I own this profile or have permission to analyze it, and I will follow the platform’s rules.
        </label>
        <div className="flex flex-wrap gap-2">
          {(["instagram", "facebook"] as const).map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy || signingIn || !allowed}
              onClick={() =>
                run(async () => {
                  const r = await call("login", { network: n });
                  setSigningIn(true);
                  setMsg(r.message ?? "Sign in in the browser window, then click Done signing in.");
                })
              }
              className="ctl min-h-11 rounded-xl px-3 font-semibold text-ink"
            >
              Sign in to {n === "instagram" ? "Instagram" : "Facebook"}
            </button>
          ))}
          {signingIn && (
            <button
              type="button"
              disabled={working}
              onClick={() =>
                run(async () => {
                  await call("login/finish");
                  setSigningIn(false);
                  setMsg("Signed in. Now paste a profile link and analyze.");
                })
              }
              className="btn-primary min-h-11 rounded-xl px-3 font-semibold"
            >
              Done signing in
            </button>
          )}
        </div>
        <label className="block font-semibold text-ink" htmlFor="profile-url">
          Profile link
        </label>
        <input
          id="profile-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.instagram.com/yourprofile"
          inputMode="url"
          autoComplete="off"
          className="well block min-h-11 w-full min-w-0 rounded-xl bg-transparent px-3 text-sm"
        />
        <button
          type="button"
          disabled={busy || signingIn || !allowed || url.trim().length < 3}
          onClick={() =>
            run(async () => {
              setMsg("Collecting posts. This can take a minute or two…");
              const data = await call("analyze", { url: url.trim() }, 240000);
              if (data.schema_version !== 2) throw new Error("Unsupported analysis schema; version 2 required.");
              setMsg("");
              onAnalyzed(data, url.trim().replace(/^https?:\/\/(www\.)?/, ""));
            })
          }
          className="btn-primary min-h-11 w-full rounded-xl px-4 font-semibold"
        >
          Analyze this profile
        </button>
        {msg && (
          <p role="status" className="text-slate-700">
            {msg}
          </p>
        )}
      </div>
    </details>
  );
}

/* ---------- Chatbot ---------- */
function Chat() {
  const analysis = useContext(Results);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<{ me: boolean; t: string }[]>([
    {
      me: false,
      t: "Ask what changed, what it means, or what to try next. I use only the data you uploaded.",
    },
  ]);
  const messages = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number>(0);
  /* Exit is shorter than entry (160ms vs 220ms) and heads back toward the launcher. */
  const close = () => {
    launcher.current?.focus({ preventScroll: true });
    setClosing(true);
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 160);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!open) return;
    input.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  useEffect(() => {
    if (messages.current) messages.current.scrollTop = messages.current.scrollHeight;
  }, [msgs, open]);
  /* Optional AI answers: shown only when the server enables them, and off until the person turns them on. */
  const [aiAvailable, setAiAvailable] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [slow, setSlow] = useState(false);
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  useEffect(() => {
    let alive = true;
    fetch(`${apiBase}/api/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => alive && setAiAvailable(h?.ai === true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [apiBase]);
  const send = async (t: string) => {
    if (!t.trim() || thinking) return;
    setText("");
    setMsgs((m) => [...m, { me: true, t }]);
    if (!analysis) {
      setMsgs((m) => [
        ...m,
        {
          me: false,
          t: "Upload a dataset or load the labeled synthetic demo first. No social account is connected.",
        },
      ]);
      return;
    }
    if (aiOn && aiAvailable) {
      setThinking(true);
      setSlow(false);
      const slowTimer = window.setTimeout(() => setSlow(true), 8000);
      try {
        const { preview: _preview, post_references: _refs, ...summary } = analysis;
        const response = await fetch(`${apiBase}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: t, analysis: summary }),
          signal: AbortSignal.timeout(130000),
        });
        if (!response.ok) throw new Error("ai");
        const { answer: aiAnswer } = await response.json();
        setMsgs((m) => [...m, { me: false, t: plainChat(String(aiAnswer)) }]);
      } catch {
        setMsgs((m) => [
          ...m,
          {
            me: false,
            t: `That did not load, so here is the standard answer instead. ${plainChat(answer(t, analysis))}`,
          },
        ]);
      } finally {
        window.clearTimeout(slowTimer);
        setThinking(false);
        setSlow(false);
      }
      return;
    }
    setMsgs((m) => [...m, { me: false, t: plainChat(answer(t, analysis)) }]);
  };
  const quickQuestions = analysis
    ? [
        { label: "Decision brief", question: "Show my decision brief" },
        ...(funnelStages(analysis).some((stage) => stage.value != null)
          ? [{ label: "Independent counts", question: "Explain the funnel counts" }]
          : []),
        moduleInfo("recommend", analysis).status === "Ready"
          ? { label: "Measure a test", question: "How do I measure success?" }
          : { label: "Add needed data", question: "What should I do next?" },
        ...(analysis.correlation.some((pair) => pair.r < 0)
          ? [{ label: "Explain negative", question: "What does negative mean?" }]
          : analysis.sentiment.available
            ? [{ label: "Review feedback", question: "Summarize feedback" }]
            : []),
      ]
    : [
        { label: "What next?", question: "What should I do next?" },
        { label: "Summarize totals", question: "Summarize totals" },
        { label: "Explain negative", question: "What does negative mean?" },
      ];
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      {open && (
        <div
          role="dialog"
          aria-label="Ask about your analysis"
          className={`overlay flex h-[min(30rem,calc(100dvh-5.5rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl sm:w-96 ${closing ? "popover-out" : "popover-in"}`}
        >
          <div className="flex shrink-0 items-center justify-between px-3">
            <p className="inline-flex items-center gap-2 font-display font-bold text-ink">
              <Logo variant="mark" size={22} />
              Ask Speculara
            </p>
            {aiAvailable && (
              <label className="ml-auto mr-1 flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={aiOn}
                  onChange={(e) => setAiOn(e.target.checked)}
                  aria-describedby="ai-note"
                  className="h-5 w-5 accent-[var(--color-ink)]"
                />
                Use AI answers
                <span id="ai-note" className="sr-only">
                  {aiOn ? "On: a summary of your results is sent to Google." : "Off: nothing leaves this app."}
                </span>
              </label>
            )}
            <button
              onClick={close}
              aria-label="Close chat"
              className="ctl grid h-11 w-11 place-items-center rounded-full text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div
            ref={messages}
            className="well neu-scroll mx-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain rounded-2xl p-3 text-sm"
            aria-live="polite"
          >
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3 py-2 ${m.me ? "ml-auto bg-white text-neutral-900" : "border border-border-default bg-raised text-slate-800"}`}
              >
                {m.t}
              </div>
            ))}
            {thinking && (
              <div role="status" className="skeleton-pulse max-w-[85%] rounded-2xl bg-raised px-3 py-2 text-slate-700">
                {slow ? "Still working. AI answers can take up to a minute." : "Writing an answer…"}
              </div>
            )}
          </div>
          {aiAvailable && aiOn && (
            <p className="mx-3 mt-1 shrink-0 text-sm text-slate-600">
              A summary of your results (totals, relationships, forecasts) is sent to Google to write each answer. Your rows, post links and comments are not sent.
            </p>
          )}
          <div
            role="group"
            aria-label="Suggested questions"
            className="mx-3 mt-1 grid shrink-0 grid-cols-2 gap-2 [@media(min-width:600px)]:grid-cols-4"
          >
            {quickQuestions.map(({ label, question }) => (
              <button
                key={question}
                onClick={() => send(question)}
                className="ctl min-h-11 min-w-0 rounded-full px-2 py-2 text-left text-xs leading-snug text-ink"
              >
                {label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="flex shrink-0 gap-2 p-2"
          >
            <input
              ref={input}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about your results"
              aria-label="Your question"
              className="well min-h-11 min-w-0 flex-1 rounded-xl bg-transparent px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            />
            <button className="btn-primary min-h-11 rounded-xl px-4 text-sm">Send</button>
          </form>
        </div>
      )}
      <button
        ref={launcher}
        onClick={() => {
          if (open) close();
          else {
            window.clearTimeout(closeTimer.current);
            setClosing(false);
            setOpen(true);
          }
        }}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className="btn-primary grid h-14 w-14 place-items-center rounded-full"
      >
        <svg
          width="26"
          height="26"
          style={{ transform: "translate(-0.6px, -0.3px)" }} /* optical centre: the bubble's tail pulls the shape down and to the left */
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" />
        </svg>
      </button>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [picked, setPicked] = useState<Key | null>(null);
  const [tab, setTab] = useState<Key | null>(null);
  const [err, setErr] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [source, setSource] = useState<{ label: string; demo: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [viewRevision, setViewRevision] = useState(0);
  const [notice, setNotice] = useState("");
  /* Notices are toasts: they appear bottom left and dismiss themselves. */
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(t);
  }, [notice]);
  const [loadingMessage, setLoadingMessage] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);
  const [candidate, setCandidate] = useState<{ data: Analysis; label: string } | null>(null);
  useEffect(() => {
    if (candidate) document.getElementById("upload-preview-title")?.focus();
  }, [candidate]);
  const commitDataset = (data: Analysis, label: string, demo = false) => {
    setAnalysis(data);
    setUpdatedAt(Date.now());
    setSource({ label, demo: demo || data.source_kind === "synthetic" });
    setRevision((v) => v + 1);
    setPicked("recommend");
    setTab("charts");
    setNudge(true);
    setCandidate(null);
    setTimeout(() => document.getElementById("dataset-summary")?.focus(), 0);
  };
  const analyzeFile = async (file: File, demo = false) => {
    const currentRequest = ++requestId.current;
    setCandidate(null);
    setErr("");
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setErr("Choose a CSV or XLSX file.");
      return;
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      setErr("Upload a nonempty file up to 5 MB.");
      return;
    }
    setBusy(true);
    setNotice("");
    setLoadingMessage("Checking your file...");
    const slowTimer = setTimeout(
      () =>
        setLoadingMessage(
          "Still waiting for the analysis service. The first request can take up to a minute.",
        ),
      8000,
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
      const response = await fetch(`${base}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Filename": file.name.toLowerCase().endsWith(".xlsx") ? "upload.xlsx" : "upload.csv",
        },
        body: file,
        signal: controller.signal,
      });
      if (currentRequest !== requestId.current) return;
      setLoadingMessage(demo ? "Preparing your results..." : "Preparing your preview...");
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string" ? data.detail : "Analysis failed. Check your file.",
        );
      if (data.schema_version !== 2)
        throw new Error("Unsupported analysis schema; version 2 required.");
      if (currentRequest !== requestId.current) return;
      if (demo) commitDataset(data, file.name, true);
      else setCandidate({ data, label: file.name });
    } catch (e) {
      if (currentRequest !== requestId.current) return;
      setErr(
        e instanceof Error && e.name === "AbortError"
          ? "Analysis timed out. Render may be waking up; retry shortly."
          : e instanceof Error
            ? e.message
            : "Cannot reach analysis API. Check backend configuration.",
      );
    } finally {
      clearTimeout(timer);
      clearTimeout(slowTimer);
      if (currentRequest === requestId.current) {
        setLoadingMessage("");
        setBusy(false);
      }
    }
  };
  const loadDemo = async () => {
    setCandidate(null);
    setBusy(true);
    setNotice("");
    setLoadingMessage("Opening the synthetic demo file...");
    setErr("");
    try {
      const response = await fetch("/demo/speculara-synthetic.csv");
      if (!response.ok) throw new Error("Demo file unavailable.");
      const file = new File([await response.blob()], "speculara-synthetic.csv", {
        type: "text/csv",
      });
      await analyzeFile(file, true);
    } catch {
      setErr("Demo file could not load. Try uploading the downloadable CSV.");
    } finally {
      setBusy(false);
      setLoadingMessage("");
    }
  };
  const exportResults = (kind: "report" | "json") => {
    if (!analysis || !source) return;
    try {
      if (kind === "report")
        download(
          "speculara-report.md",
          analysisReport(analysis, `${source.demo ? "SYNTHETIC DEMO: " : ""}${source.label}`),
        );
      else
        download(
          "speculara-analysis.json",
          JSON.stringify({ source, ...analysis }, null, 2),
          "application/json",
        );
      setNotice(kind === "report" ? "Report download started." : "Results download started.");
    } catch {
      setNotice("The download could not start. Please try again.");
    }
  };
  const resetView = () => {
    setPicked("recommend");
    setTab("charts");
    setViewRevision((v) => v + 1);
    setErr("");
    setNudge(false);
    setNotice("View reset. Your data is unchanged.");
    setTimeout(() => document.getElementById("result")?.focus(), 0);
  };

  const others = ORDER.filter((k) => k !== picked);
  const active = tab && tab !== picked ? tab : others[0];
  const Primary = picked ? VIEWS[picked] : null;
  const Secondary = VIEWS[active];
  const colors = [INK, WINE, INK, WINE, INK, WINE];
  const locked = !analysis || busy;

  return (
    <Results.Provider value={analysis}>
      <Splash />
      <div className="min-h-screen pb-24">
        <main id="main">
          <ResponsiveHeroBanner
            onCtaClick={() => void loadDemo()}
            onPrimaryClick={() => void loadDemo()}
            onSecondaryClick={() => {
              document.getElementById("start")?.scrollIntoView({ behavior: "smooth" });
              document.getElementById("upload")?.focus({ preventScroll: true });
            }}
          />
          <div className="mx-auto max-w-[var(--layout-app)] px-[var(--layout-gutter)]">
          <section className="grid items-start gap-10 py-10 md:grid-cols-[1.05fr_1fr] md:py-14">
            <div className="min-w-0 md:pt-2">
              <p className="font-display text-3xl text-ink">See it before you upload</p>
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink">
                {["Plain-English answers", "Nothing is saved", "No account needed"].map((t) => (
                  <li key={t} className="inline-flex items-center gap-1.5">
                    <Icon name="check" size="sm" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="surface mt-6 hidden max-w-lg rounded-2xl p-5 md:block" aria-hidden="true">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Example of an answer</p>
                <p className="mt-1 font-sans text-lg font-semibold leading-snug text-ink">
                  Sales dipped a little last week, and your carousel posts did best.
                </p>
                <div className="mt-4 flex h-16 items-end gap-1.5">
                  {[38, 52, 44, 60, 48, 70, 56, 34].map((h, i) => (
                    <div
                      key={i}
                      className="bar-grow w-full rounded-t-md"
                      style={{ ["--i" as string]: i, height: `${h}%`, background: i === 5 ? "var(--color-ink)" : "var(--color-chart-secondary)" }}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-600">Sample numbers for illustration, not your data.</p>
              </div>
            </div>

            <div ref={listRef} id="start" className="surface min-w-0 scroll-mt-6 rounded-2xl p-5 sm:p-6">
              <h2 className="font-display text-3xl text-ink">Start with your data</h2>
              <p className="mt-1 text-sm text-slate-600">Upload a file, or try the demo first.</p>
              <div className="mt-4" aria-busy={busy}>
                <label htmlFor="upload" className="mb-2 block text-sm font-semibold text-ink">
                  Upload your dataset
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!busy) setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && !busy) void analyzeFile(file);
                  }}
                  className={`rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${dragging ? "border-ink bg-ink/5" : "border-border-default"}`}
                >
                  <Illustration name="upload" className="mx-auto h-20 w-auto" />
                  <p className="mt-1 text-sm text-slate-700">Drop a CSV or XLSX file here, or choose one</p>
                  <input
                    id="upload"
                    type="file"
                    accept=".csv,.xlsx"
                    disabled={busy}
                    aria-describedby="upload-help upload-msg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void analyzeFile(file);
                      e.target.value = "";
                    }}
                    className="mt-3 block min-h-11 w-full min-w-0 rounded-xl text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-neutral-900"
                  />
                </div>
                <p id="upload-help" className="mt-2 text-sm text-slate-600">
                  CSV (UTF-8) or XLSX first sheet. Up to 5 MB, 20,000 rows, 50 columns. No account
                  connection required.
                </p>
                <p id="upload-msg" className="mt-2 text-sm text-wine" role="alert">
                  {err}
                </p>
                {busy && (
                  <p role="status" className="mt-2 text-sm font-semibold text-ink">
                    {loadingMessage}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void loadDemo()}
                  className="ctl mt-3 min-h-11 w-full rounded-xl text-sm font-semibold text-ink"
                >
                  Try synthetic demo data
                </button>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <a
                    href="/demo/speculara-synthetic.csv"
                    download
                    className="inline-flex min-h-[var(--size-target)] min-w-[var(--size-target)] items-center rounded-lg px-2 py-2 text-ink underline"
                  >
                    Demo CSV
                  </a>
                  <a
                    href="/demo/speculara-synthetic.xlsx"
                    download
                    className="inline-flex min-h-[var(--size-target)] min-w-[var(--size-target)] items-center rounded-lg px-2 py-2 text-ink underline"
                  >
                    Demo XLSX
                  </a>
                  <a
                    href="/demo/speculara-text-synthetic.csv"
                    download
                    className="inline-flex min-h-[var(--size-target)] min-w-[var(--size-target)] items-center rounded-lg px-2 py-2 text-ink underline"
                  >
                    Text-only demo
                  </a>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Demo records are fictional, not real campaign results. Uploads are processed in
                  server memory and never saved.
                </p>
                <ProfileLink
                  disabled={busy}
                  onAnalyzed={(data, label) => {
                    setErr("");
                    setNotice("");
                    setCandidate({ data, label });
                  }}
                />
              </div>
              {locked && (
                <p className="mt-2 px-2 text-center text-xs text-slate-600">
                  Upload data or try the synthetic demo to unlock modules.
                </p>
              )}
            </div>
          </section>

          {candidate && (
            <section
              aria-labelledby="upload-preview-title"
              className="surface focus-in mb-10 min-w-0 rounded-2xl p-5 sm:p-6"
            >
              <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
                <div className="min-w-0">
                  <h2
                    id="upload-preview-title"
                    tabIndex={-1}
                    className="font-display text-xl font-bold text-ink"
                  >
                    Upload preview
                  </h2>
                  <p className="mt-2 break-all font-semibold text-ink">{candidate.label}</p>
                  {candidate.data.source_kind === "synthetic" && (
                    <p className="mt-2 text-sm font-semibold text-wine">
                      Synthetic demo: fictional records
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-700">
                    {candidate.data.rows.toLocaleString()} rows. Review this file before using it.
                    Your current results stay unchanged until you confirm.
                  </p>
                  <p className="mt-3 break-words text-sm text-slate-700">
                    Detected columns:{" "}
                    {(candidate.data.preview?.columns ?? candidate.data.columns).join(", ")}
                  </p>
                  {candidate.data.preview?.rows.length ? (
                    <div
                      className="mt-3 max-w-full overflow-x-auto rounded-lg"
                      role="region"
                      aria-label="Preview rows"
                      tabIndex={0}
                    >
                      <table
                        className="w-full table-fixed text-left text-xs"
                        style={{
                          minWidth: `${Math.max(280, candidate.data.preview.columns.length * 120)}px`,
                        }}
                      >
                        <caption className="pb-2 text-left text-slate-700">
                          First {Math.min(5, candidate.data.preview.rows.length)} rows of{" "}
                          {candidate.data.preview.total_rows.toLocaleString()}
                        </caption>
                        <thead>
                          <tr>
                            {candidate.data.preview.columns.map((column) => (
                              <th key={column} scope="col" className="p-2 [overflow-wrap:anywhere]">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {candidate.data.preview.rows.slice(0, 5).map((row, index) => (
                            <tr key={index}>
                              {candidate.data.preview!.columns.map((column) => (
                                <td
                                  key={column}
                                  className="border-t border-ink/10 p-2 align-top [overflow-wrap:anywhere]"
                                >
                                  {row[column] == null ? "—" : String(row[column])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-700">
                      Row preview is unavailable for this response.
                    </p>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-2xl text-ink">What this file supports</h3>
                  <ul className="mt-3 space-y-3">
                    {ORDER.map((key) => {
                      const info = moduleInfo(key, candidate.data);
                      return (
                        <li key={key} className="min-w-0 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{META[key].tab}</span>
                            <StatusBadge module={key} analysis={candidate.data} />
                          </div>
                          <p className="mt-1 break-words text-slate-700">
                            {info.needed ?? info.finding}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => commitDataset(candidate.data, candidate.label)}
                      className="btn-primary min-h-11 rounded-xl px-4 text-sm"
                    >
                      Use this dataset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCandidate(null);
                        document.getElementById("upload")?.focus();
                      }}
                      className="ctl min-h-11 rounded-xl px-4 text-sm text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section id="questions" aria-labelledby="modules-title" className="scroll-mt-6 pb-12">
            <h2 id="modules-title" className="font-display text-4xl text-ink md:text-5xl">
              What do you want to know?
            </h2>
            <p className="mt-1 text-slate-600">Pick a question. Each one turns your numbers into a plain answer.</p>
            {nudge && (
              <p role="status" className="chip mt-4 inline-block px-3 py-2 text-sm">
                Analyzed {source?.label}. Choose any module to explore.
              </p>
            )}
            <ul aria-label="Questions" className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ORDER.map((k, i) => (
                <li key={k} className="stagger-in" style={{ ["--i" as string]: i }}>
                  <button
                    disabled={locked}
                    aria-pressed={picked === k}
                    onClick={() => {
                      setPicked(k);
                      setTab(null);
                      setTimeout(
                        () => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }),
                        50,
                      );
                    }}
                    className={`ctl flex h-full min-h-[var(--size-target)] w-full flex-col items-start gap-3 rounded-2xl p-4 text-left disabled:opacity-80 ${picked === k ? "is-selected" : ""} ${locked ? "border-dashed !bg-transparent" : ""}`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink/10 text-ink">
                      <Icon name={k} size="lg" />
                    </span>
                    <span className="font-sans text-lg font-semibold leading-snug">{META[k].q}</span>
                    <StatusBadge module={k} analysis={analysis} />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {busy && !analysis && <AnalysisLoader />}
          {analysis && (
            <section
              key={`summary-${revision}-${viewRevision}`}
              className="surface result-arrive mb-6 rounded-3xl p-5"
              aria-label="Dataset summary"
              id="dataset-summary"
              tabIndex={-1}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="break-words font-semibold text-ink">
                    {source?.demo ? "Synthetic demo: fictional records" : "Uploaded dataset"}:{" "}
                    {source?.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {analysis.rows.toLocaleString()} rows; {analysis.metrics.length} numeric
                    metrics. All six modules use this analysis.
                  </p>
                  {updatedAt !== null && <UpdatedAt at={updatedAt} />}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    className="btn-primary min-h-11 rounded-xl px-4 text-sm"
                    onClick={() => exportResults("report")}
                  >
                    Download report
                  </button>
                  <button
                    className="ctl min-h-11 rounded-xl px-4 text-sm text-ink"
                    onClick={() => exportResults("json")}
                  >
                    Results JSON
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={resetView}
                    className="ctl min-h-11 rounded-xl px-4 text-sm text-ink"
                  >
                    Reset view
                  </button>
                  <button
                    className="ctl min-h-11 rounded-xl px-4 text-sm text-wine"
                    disabled={busy}
                    onClick={() => {
                      setCandidate(null);
                      setAnalysis(null);
                      setSource(null);
                      setUpdatedAt(null);
                      setNotice("");
                      setPicked(null);
                      setTab(null);
                      setNudge(false);
                      setRevision((v) => v + 1);
                    }}
                  >
                    Clear data
                  </button>
                </div>
              </div>
              <p
                role="status"
                className={
                  notice
                    ? "overlay focus-in fixed bottom-4 left-4 z-[var(--z-toast)] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-ink sm:max-w-sm"
                    : "sr-only"
                }
              >
                {notice && <Icon name="success" size="sm" />}
                {notice}
              </p>
              <details className="mt-4 text-base leading-7">
                <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2 font-semibold text-ink">
                  About this data
                </summary>
                <ul className="mt-3 list-disc space-y-3 pl-5 text-slate-700">
                  {source?.demo && <li>This demo uses made-up records.</li>}
                  <li>Results come from this file, not a connected social account.</li>
                  {Object.values(analysis.missing).some((n) => n > 0) && (
                    <li>Some counts are missing. They are left out, not counted as zero.</li>
                  )}
                  {analysis.warnings.some((w) => w.includes("missing/invalid dates")) && (
                    <li>
                      Some dates are missing or unreadable. Time comparisons may be unavailable.
                    </li>
                  )}
                  {analysis.warnings.some((w) => w.includes("chart limited")) && (
                    <li>Some chart groups are hidden. Totals still include all entries.</li>
                  )}
                  <li>
                    {analysis.warnings.some((w) => w.includes("exact duplicate"))
                      ? "Some entries repeat. Check they were not counted twice."
                      : "Check that each entry is counted only once."}
                  </li>
                  <li>Patterns are clues, not proof of what caused a change.</li>
                  <li>Forecasts are estimates. Comment labels can miss context.</li>
                </ul>
                <p className="mt-4 text-slate-700">
                  Download the report for full methods and data checks.
                </p>
              </details>
            </section>
          )}
          <div id="result" tabIndex={-1} className="scroll-mt-24">
            {analysis && <DecisionOverview key={`overview-${revision}`} />}
            {Primary ? (
              <>
                <h2 className="sr-only">{META[picked!].title}</h2>
                <div className="result-arrive">
                  <Primary key={`primary-${revision}-${viewRevision}-${picked}`} />
                </div>
                <div className="mt-10">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-600">
                    Explore the others
                  </p>
                  <div
                    className="mb-3 flex flex-wrap gap-3 p-2"
                    role="group"
                    aria-label="Analysis options"
                  >
                    {others.map((k) => (
                      <button
                        key={k}
                        aria-pressed={k === active}
                        onClick={() => setTab(k)}
                        className={`min-h-[var(--size-target)] min-w-[var(--size-target)] max-w-full rounded-xl px-4 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-sky ${k === active ? "ctl is-selected font-semibold text-ink selection-pop" : "ctl text-slate-600 hover:text-ink"}`}
                      >
                        {META[k].tab}
                      </button>
                    ))}
                  </div>
                  <div className="result-arrive">
                    <Secondary key={`secondary-${revision}-${viewRevision}-${active}`} />
                  </div>
                </div>
              </>
            ) : (
              <div className="well rounded-3xl p-8 text-center text-slate-600">
                {locked
                  ? "Your results appear here after uploading a dataset or loading the synthetic demo."
                  : "Choose a question above to see your first result here."}
              </div>
            )}
          </div>


          <section
            id="docs"
            aria-label="About your results"
            className="surface mb-12 mt-10 scroll-mt-24 rounded-2xl p-5 text-sm text-slate-700 sm:p-6"
          >
            <p className="font-semibold text-ink">About your results</p>
            <p className="mt-1">
              Your uploaded data powers these findings. Open “See the numbers” for the evidence
              behind each result.
            </p>
            <details className="mt-3">
              <summary className="min-h-[var(--size-target)] content-center rounded-lg py-2">
                Data guide
              </summary>
              <p className="mt-2">
                Use one row per observation. Supported columns: date, post_id, category, region,
                views, likes, saves, comments, sales, text. Counts must be nonnegative; blanks mean
                unknown. Avoid repeating whole-post totals for every comment. No social account is
                connected.
              </p>
            </details>
          </section>
          </div>
        </main>
        <footer className="border-t border-border-default bg-canvas">
          <div className="mx-auto flex max-w-[var(--layout-app)] flex-wrap items-center justify-between gap-3 px-[var(--layout-gutter)] py-8 text-sm text-slate-600">
            <Logo size={24} />
            <p>Honest numbers. Plain words. Demo records are fictional.</p>
          </div>
        </footer>
        <Chat key={revision} />
      </div>
    </Results.Provider>
  );
}
