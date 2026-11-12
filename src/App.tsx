import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  answer,
  plainChat,
  analysisReport,
  download,
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
import { ChatBotIcon } from "./components/ui/chat-bot-icon";
import { CommentReader, WeeklyBrief } from "./components/writers";
import { CommentExplorer } from "./components/comment-explorer";
import { AnalysisLoader } from "./design-system/AnalysisLoader";
import {
  Card,
  DataTable,
  Fact,
  FactGrid,
  H,
  NoteList,
  Numbers,
  Pills,
  SubHead,
  Well,
} from "./design-system/ui";
import { ForecastHero, ModuleTitle, SentimentBar, SignalBar, WordChips } from "./components/module-visuals";
import { CollectionFacts, DownloadButtons, Emphasis, MetricTile, PostGallery, PreviewRows, ProfileHeader } from "./components/collected";
import { RollingNumber, isRollable } from "./design-system/RollingNumber";
import ResponsiveHeroBanner from "./components/ui/responsive-hero-banner";
import DashboardPreview from "./components/dashboard-preview";
import EdgeBlur from "./design-system/EdgeBlur";
import {
  ArrowUp,
  Calculator,
  CloudUpload,
  Download,
  Lock,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  TriangleAlert,
} from "lucide-react";

import { moduleInfo, updatedLabel, priorityLabel, type ModuleKey } from "./polish";

type Key = ModuleKey;

const INK = "var(--color-ink)",
  SKY = "var(--color-orange)",
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
      {isRollable(String(v)) ? <RollingNumber value={String(v)} /> : v}
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
      <ModuleTitle module="predict" sub="A guide to what might happen next.">Predict</ModuleTitle>
      <ModuleBrief module="predict" />
      {f.available ? (
        <>
          <ForecastHero
            metric={calculationLabel(f.metric)}
            date={f.points[0].label}
            value={number(f.points[0].value)}
          />
          <p className="mt-3 text-sm text-slate-700">
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
            <section>
              <SubHead note="How the estimate was checked against days the model had not seen.">
                Model comparison
              </SubHead>
              <FactGrid
                items={[
                  { label: "Model used", value: f.selected_model },
                  { label: "Training days", value: number(f.evaluation.train_days) },
                  { label: "Held-out dates", value: f.evaluation.holdout_dates.join(", ") },
                  { label: `Typical error (${f.metric} per day)`, value: number(f.mae) },
                ]}
              />
            </section>
            <section>
              <SubHead note={`Mean absolute error in ${f.metric}. Lower is better.`}>
                Error by model
              </SubHead>
              <DataTable
                columns={["Model", "Error (MAE)"]}
                rows={Object.entries(f.evaluation.scores).map(([model, score]) => [
                  model,
                  number(score),
                ])}
                highlightRow={Object.keys(f.evaluation.scores).indexOf(f.selected_model)}
              />
            </section>
            <section>
              <SubHead>Daily estimates</SubHead>
              <DataTable
                columns={["Date", `Estimated ${f.metric}`]}
                rows={f.points.map((p) => [p.label, number(p.value)])}
              />
            </section>
            <NoteList items={[f.method, ...f.notes]} />
          </Numbers>
        </>
      ) : (
        <>
          <Numbers>
            <p className="text-sm">{f.reason}</p>
          </Numbers>
        </>
      )}
    </Card>
  );
}
function DecisionOverview() {
  const a = useAnalysis();
  const brief = decisionBrief(a);
  const stages = funnelStages(a);
  const stage = (key: string) => stages.find((s) => s.key === key);
  const counted = (key: "likes" | "comments") => ({
    key,
    label: key === "likes" ? "Likes" : "Comments",
    value: a.totals[key] ?? null,
    note: "Sum of known counts; missing counts are excluded.",
  });
  const tiles = [stage("views"), counted("likes"), counted("comments"), stage("saves"), stage("questions"), stage("sales")].filter(Boolean) as {
    key: string;
    label: string;
    value: number | null;
    note: string;
  }[];
  return (
    <div className="mb-8 space-y-6">
      <Card label="Decision brief">
        <H sub="Start with the evidence, then choose one small test.">Your decision brief</H>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">What changed</p>
        <p className="mt-1 break-words font-sans text-2xl font-medium leading-snug tracking-tight text-ink sm:text-3xl">
          <Emphasis text={brief.changed} />
        </p>
        <dl className="mt-6 grid gap-x-8 gap-y-5 border-t border-border-default pt-5 sm:grid-cols-3">
          <Fact label="Why it matters">
            <Emphasis text={brief.matters} />
          </Fact>
          <Fact label="Try next">
            <Emphasis text={brief.try_next} />
          </Fact>
          <Fact label="How to measure">{brief.measure}</Fact>
        </dl>
      </Card>
      <WeeklyBrief analysis={a} />
      <Card label="Independent counts">
        <H sub="Attention, interest, questions and purchases recorded in this file.">Independent counts</H>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tiles.map((t) => (
            <MetricTile key={t.key} id={t.key} label={t.label} value={t.value} note={t.note} />
          ))}
        </dl>
        <p className="mt-5 text-sm text-slate-600">{a.funnel?.note ?? FUNNEL_NOTE}</p>
        <PostGallery analysis={a} safeUrl={safePostUrl} />
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
      {item.technical ? (
        <Numbers>
          <SubHead note="The original analysis behind this suggestion.">Technical detail</SubHead>
          <dl className="space-y-3">
            <Fact label="Finding">{item.technical.finding}</Fact>
            <Fact label="Evidence">{item.technical.evidence}</Fact>
            <Fact label="Suggested action">{item.technical.action}</Fact>
          </dl>
        </Numbers>
      ) : (
        item.details && <Numbers>{item.details}</Numbers>
      )}
    </li>
  );
}
function Recommend() {
  const a = useAnalysis();
  return (
    <Card label="Recommendations results">
      <ModuleTitle module="recommend" sub="Small steps you can test, based on your data.">Your next decisions</ModuleTitle>
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
        {Object.keys(a.periods).length === 0 ? (
          <p className="text-sm">
            Period comparisons unavailable: need dated numeric metrics and all 14 calendar dates.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm tabular-nums">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="py-2 pr-4">Metric</th>
                  <th className="py-2 pr-4">Previous 7 days</th>
                  <th className="py-2 pr-4">Current 7 days</th>
                  <th className="py-2 pr-4 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(a.periods).map(([metric, p]) =>
                  p!.available ? (
                    <tr key={metric} className="border-t border-black/10 align-top">
                      <th scope="row" className="py-3 pr-4 font-semibold capitalize text-ink">
                        {metric}
                      </th>
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-ink">{number(p!.previous_total ?? 0)}</div>
                        <div className="text-xs text-slate-600">
                          {p!.previous_start} to {p!.previous_end}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-semibold text-ink">{number(p!.current_total ?? 0)}</div>
                        <div className="text-xs text-slate-600">
                          {p!.current_start} to {p!.current_end}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="font-semibold text-ink">
                          {(p!.absolute_change ?? 0) > 0 ? "+" : ""}
                          {number(p!.absolute_change ?? 0)}
                        </div>
                        <div className="text-xs text-slate-600">
                          {p!.percent_change == null
                            ? p!.percent_change_reason
                            : `${p!.percent_change > 0 ? "+" : ""}${p!.percent_change.toFixed(1)}%`}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={metric} className="border-t border-black/10 align-top">
                      <th scope="row" className="py-3 pr-4 font-semibold capitalize text-ink">
                        {metric}
                      </th>
                      <td colSpan={3} className="py-3 pr-4 text-slate-600">
                        {p!.reason}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-600">
          Latest seven UTC calendar dates versus prior seven. All 14 dates are needed; missing dates
          are not zero activity.
        </p>
      </Well>
    );
  return (
    <>
      <section>
        <SubHead note="Counts compared with views. Rows with missing or zero views are left out.">
          Ratios
        </SubHead>
        <DataTable
          columns={["Ratio", "Count", "Views", "Rate", "Rows used", "Left out"]}
          rows={Object.entries(a.ratios).map(([k, r]) => [
            calculationLabel(k),
            r.available ? `${number(r.numerator ?? 0)} ${r.numerator_metric}` : "n/a",
            r.available ? number(r.denominator ?? 0) : "n/a",
            r.available ? `${r.percent!.toFixed(2)}%` : "n/a",
            number(r.n),
            number(r.excluded_rows + r.zero_view_rows),
          ])}
        />
        <NoteList
          items={[
            ...Object.entries(a.ratios)
              .filter(([, r]) => !r.available)
              .map(([k, r]) => `${calculationLabel(k)}: ${r.reason}`),
            ...Array.from(new Set(Object.values(a.ratios).flatMap((r) => r.notes))),
          ]}
        />
      </section>
      <section>
        <SubHead note="Top 10 by rate, then label. A guide to exposure, not proof that one group is better.">
          Rankings
        </SubHead>
        <NoteList
          items={[
            "Categories need 3 complete rows with positive views and 1,000 views in total.",
            "Posts need a unique nonblank ID and at least 100 views.",
          ]}
        />
        {Object.entries(a.rankings).flatMap(([g, rs]) =>
          Object.entries(rs).map(([k, r]) => (
            <div key={g + k} className="mt-4">
              <h5 className="mb-1 text-sm font-semibold text-ink">
                {calculationLabel(g)}: {k.replace(/_/g, " ")}
              </h5>
              {!r.available ? (
                <p className="text-sm text-slate-600">{r.reason}</p>
              ) : (
                <DataTable
                  columns={["Label", "Count", "Views", "Rate", "Rows"]}
                  rows={r.rows.map((x) => [
                    x.label,
                    number(x.numerator),
                    number(x.views),
                    `${x.percent.toFixed(2)}%`,
                    x.n,
                  ])}
                />
              )}
              {r.excluded_groups > 0 && (
                <p className="mt-1 text-xs text-slate-600">
                  {r.excluded_groups} groups left out for too little data.
                </p>
              )}
            </div>
          )),
        )}
      </section>
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
      <ModuleTitle module="charts" sub="See how your numbers compare.">Charts</ModuleTitle>
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
        <NoteList
          items={[
            "Each chart starts at zero.",
            "Date groups are daily UTC totals.",
            "Blank counts are left out.",
          ]}
        />
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
          <section>
            <SubHead note={`Based on ${p.n} complete pairs of values.`}>
              {calculationLabel(p.a)} and {p.b}
            </SubHead>
            <DataTable
              columns={["Method", "Strength", "p-value (unadjusted)"]}
              rows={[
                ["Pearson r", p.r.toFixed(3), p.p.toExponential(2)],
                ["Spearman rho", p.spearman_r.toFixed(3), p.spearman_p.toExponential(2)],
              ]}
            />
          </section>
          <NoteList
            items={[
              "These statistics describe a pattern, not a cause.",
              "Small samples, outliers and repeated observations can affect results.",
              "p-values are not adjusted for testing many pairs.",
            ]}
          />
        </Numbers>
      </li>
    );
  };
  return (
    <Card label="Correlation results">
      <ModuleTitle module="correlation" sub="See which numbers tend to change together.">Connections in your data</ModuleTitle>
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
  const analysis = useAnalysis();
  const s = analysis.sentiment;
  const posts = analysis.provenance?.posts;
  return (
    <Card label="Sentiment results">
      <ModuleTitle module="sentiment" sub={s.available && s.basis === "captions" ? "Based on post captions, not comments" : "Based on a simple word check"}>
        How comments sound
      </ModuleTitle>
      <ModuleBrief module="sentiment" />
      {s.available ? (
        <>
          <p className="mb-4 text-sm text-slate-700">
            Reads <strong className="font-bold text-ink underline decoration-orange/60 decoration-2 underline-offset-4">{s.n!.toLocaleString()} {s.basis === "captions" ? "captions" : "comments"}</strong>
            {posts ? (
              <>
                {" "}
                from <strong className="font-bold text-ink">{posts} posts</strong>
              </>
            ) : null}
            , not just one.
          </p>
          <SentimentBar counts={s.counts!} total={s.n!} />
          {s.basis === "captions" && (
            <p className="mt-3 text-sm text-slate-700">
              <Emphasis text="No comment text was collected, so this reads your own captions. Sign in for comments and collect again to see how people reacted." />
            </p>
          )}
          {s.examples && (s.examples.positive.length > 0 || s.examples.negative.length > 0) && (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {(["positive", "negative"] as const).map((tone) =>
                s.examples![tone].length ? (
                  <div key={tone}>
                    <p className="text-sm font-semibold text-ink">{tone === "positive" ? "Most positive" : "Most negative"}</p>
                    <ul className="mt-2 grid gap-2">
                      {s.examples![tone].map((t, i) => (
                        <li key={i} data-private className="well rounded-xl px-3 py-2 text-sm text-slate-700">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          )}
          <p className="mt-5 text-sm font-semibold text-ink">Words people used most</p>
          <div className="mt-2">
            <WordChips words={s.keywords!} />
          </div>
          <p className="mt-5 text-sm text-slate-700">
            <Emphasis text="Read the comments before deciding how to respond. This is a simple word check, not a trained model, and it can miss sarcasm and context." />
          </p>
          {s.basis === "comments" && analysis.comments && analysis.comments.length > 0 && (
            <CommentExplorer comments={analysis.comments} />
          )}
          {s.basis !== "captions" && analysis.comment_texts && analysis.comment_texts.length > 0 && (
            <CommentReader texts={analysis.comment_texts} />
          )}
          <Numbers>
            <table className="w-full max-w-md text-left text-sm tabular-nums">
              <thead>
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4 text-right">Entries</th>
                  <th className="py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(s.counts!).map(([k, v]) => (
                  <tr key={k} className="border-t border-black/10">
                    <th scope="row" className="py-2 pr-4 font-semibold text-ink">
                      {calculationLabel(k)}
                    </th>
                    <td className="py-2 pr-4 text-right">{number(v)}</td>
                    <td className="py-2 text-right text-slate-600">
                      {s.n ? `${((v / s.n) * 100).toFixed(1)}%` : "n/a"}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-black/20 font-semibold text-ink">
                  <th scope="row" className="py-2 pr-4">
                    Total
                  </th>
                  <td className="py-2 pr-4 text-right">{number(s.n ?? 0)}</td>
                  <td className="py-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-slate-600">
              {s.method} Labels describe {s.n} nonempty text entries, not everyone who saw your
              content.
            </p>
          </Numbers>
        </>
      ) : (
        <>
          <Numbers>
            <p className="text-sm">{s.reason}</p>
          </Numbers>
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
  const rows = d.text_rows ?? 0;
  return (
    <Card label="Demand results">
      <ModuleTitle module="demand" sub="Look at purchases and signs of interest.">
        Demand
      </ModuleTitle>
      <ModuleBrief module="demand" />
      {d.available ? (
        <>
          {(d.inquiries != null || d.requests != null) && rows > 0 && (
            <ul className="grid gap-3 md:grid-cols-2">
              {d.inquiries != null && (
                <SignalBar icon="questions" label="Entries with questions" value={d.inquiries} of={rows} note="People asking how, where or how much." />
              )}
              {d.requests != null && (
                <SignalBar icon="demand" label="Entries asking for more" value={d.requests} of={rows} note="Requests to restock or make more." />
              )}
            </ul>
          )}
          {(d.sales != null || d.saves != null) && (
            <dl className="mt-3 grid grid-cols-2 gap-3">
              {d.sales != null && (
                <MetricTile id="sales" label={salesPeriod?.available ? "Sales in latest week" : "Sales in your data"} value={salesPeriod?.available ? salesPeriod.current_total! : d.sales} />
              )}
              {d.saves != null && (
                <MetricTile id="saves" label={savesPeriod?.available ? "Saves in latest week" : "Saves in your data"} value={savesPeriod?.available ? savesPeriod.current_total! : d.saves} />
              )}
            </dl>
          )}
          <p className="mt-4 text-sm text-slate-700">
            <Emphasis text="Interest doesn’t always turn into a purchase. Questions and requests can overlap and are not unique buyers." />
          </p>
          <p className="mt-2 text-sm text-slate-700">
            {salesPeriod?.available || savesPeriod?.available
              ? "Compare the entries from each week before deciding what to change."
              : "Review the entries and answer any recurring buying questions."}
          </p>
          <Numbers>
            <Calculations kind="periods" />
            <section>
              <SubHead note="All rows in your data, not only the latest week.">Dataset totals</SubHead>
              <FactGrid
                items={[
                  {
                    label: "Sales",
                    value: d.sales == null ? "Not supplied" : number(d.sales),
                  },
                  {
                    label: "Saves",
                    value: d.saves == null ? "Not supplied" : number(d.saves),
                  },
                ]}
              />
            </section>
            <NoteList
              items={[
                ...(d.notes ?? []),
                "Question and request counts can overlap and are not unique buyers.",
              ]}
            />
          </Numbers>
        </>
      ) : (
        <>
          <Numbers>
            <Calculations kind="periods" />
            {d.reason && <p className="text-sm text-slate-700">{d.reason}</p>}
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
function InstagramLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ig-grad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD600" />
          <stop offset=".35" stopColor="#FF7A00" />
          <stop offset=".65" stopColor="#FF0069" />
          <stop offset="1" stopColor="#7638FA" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5.5" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke="url(#ig-grad)" strokeWidth="2" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="url(#ig-grad)" />
    </svg>
  );
}

function FacebookLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#1877F2" />
      <path
        fill="#fff"
        d="M13.4 21.9v-7.6h2.5l.4-3h-2.9V9.4c0-.9.3-1.4 1.5-1.4h1.5V5.3c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.3H8v3h2.5v7.6z"
      />
    </svg>
  );
}

function TikTokLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#25F4EE"
        transform="translate(-1 -1)"
        d="M19.6 8.1a5.4 5.4 0 0 1-3.3-1.1 5.4 5.4 0 0 1-2.1-3.7h-3.2v11.6a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.1a5.9 5.9 0 1 0 5 5.8V9.4a8.6 8.6 0 0 0 5.4 1.8z"
      />
      <path
        fill="#FE2C55"
        transform="translate(1 1)"
        d="M19.6 8.1a5.4 5.4 0 0 1-3.3-1.1 5.4 5.4 0 0 1-2.1-3.7h-3.2v11.6a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.1a5.9 5.9 0 1 0 5 5.8V9.4a8.6 8.6 0 0 0 5.4 1.8z"
      />
      <path
        fill="#fff"
        d="M19.6 8.1a5.4 5.4 0 0 1-3.3-1.1 5.4 5.4 0 0 1-2.1-3.7h-3.2v11.6a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.1a5.9 5.9 0 1 0 5 5.8V9.4a8.6 8.6 0 0 0 5.4 1.8z"
      />
    </svg>
  );
}

const fmtElapsed = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* ---------- Collection settings: how much to read before Analyze ---------- */
type CollectSettings = { posts: number; comments: number; replies: boolean };
const ALL_COMMENTS = 20000;
const PRESETS: { id: string; label: string; note: string; s: CollectSettings }[] = [
  { id: "fast", label: "Fast", note: "A quick look", s: { posts: 10, comments: 20, replies: false } },
  { id: "balanced", label: "Balanced", note: "Good detail", s: { posts: 20, comments: 100, replies: true } },
  { id: "complete", label: "Complete", note: "Every comment", s: { posts: 40, comments: ALL_COMMENTS, replies: true } },
];
const SETTINGS_KEY = "speculara:collect:v1";
const POST_CHOICES = [5, 10, 20, 40, 100, 200];
const COMMENT_CHOICES: [number, string][] = [
  [0, "Skip comments (fastest)"],
  [10, "Up to 10 per post"],
  [20, "Up to 20 per post"],
  [50, "Up to 50 per post"],
  [100, "Up to 100 per post"],
  [500, "Up to 500 per post"],
  [ALL_COMMENTS, "Every comment (slowest)"],
];
function loadSettings(): CollectSettings {
  try {
    const v = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "null");
    if (v && POST_CHOICES.includes(v.posts) && COMMENT_CHOICES.some(([n]) => n === v.comments) && typeof v.replies === "boolean") return v;
  } catch {
    /* no saved choice: use the default */
  }
  return PRESETS[1].s;
}
/* A rough guide only: each post costs a few seconds, plus a few more for every 50 comments. */
function estimate(c: CollectSettings) {
  const perPost = 5 + (c.comments > 0 ? Math.ceil(Math.min(c.comments, 500) / 50) * 3 * (c.replies ? 1.4 : 1) : 0);
  const secs = c.posts * perPost;
  const label = secs < 90 ? "about a minute" : `about ${Math.round(secs / 60)} min`;
  return c.comments > 500 ? `${label} or more` : label;
}

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
  const detected = /facebook\.com/i.test(url) ? "facebook" : /instagram\.com/i.test(url) ? "instagram" : /tiktok\.com/i.test(url) ? "tiktok" : null;
  const [working, setWorking] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [msg, setMsg] = useState("");
  const [collecting, setCollecting] = useState(false);
  /* Activity log: every new step the server reports is kept, with the time it happened. */
  const [log, setLog] = useState<{ at: number; text: string }[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const logList = useRef<HTMLOListElement>(null);
  /* Live counters ("... 250 of 900 comments so far") update one line in place instead of adding a line each time. */
  const setProgress = (text: string) =>
    setLog((l) => {
      const last = l[l.length - 1];
      if (last?.text === text) return l;
      const key = (t: string) => t.replace(/\d[\d,]*/g, "#");
      if (last && /so far/.test(text) && key(last.text) === key(text)) return [...l.slice(0, -1), { at: last.at, text }];
      return [...l.slice(-59), { at: Date.now(), text }];
    });
  const [cancelling, setCancelling] = useState(false);
  const [retry, setRetry] = useState<{ limit: number; smaller: boolean } | null>(null);
  const [settings, setSettings] = useState<CollectSettings>(loadSettings);
  const [tune, setTune] = useState(false);
  const preset = PRESETS.find((p) => p.s.posts === settings.posts && p.s.comments === settings.comments && p.s.replies === settings.replies);
  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      /* storage blocked: the choice just will not be remembered */
    }
  }, [settings]);
  const progressRow = useRef<HTMLDivElement>(null);
  /* Keep the progress line and Cancel in the middle of the window, clear of the edge blur. */
  useEffect(() => {
    if (collecting) progressRow.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [collecting]);
  /* Keep the newest log line in view, and tick the elapsed clock once a second. */
  useEffect(() => {
    const el = logList.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [log]);
  useEffect(() => {
    if (!collecting) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [collecting]);
  /* While a collection runs, ask the server what it is doing every second and a half. */
  useEffect(() => {
    if (!collecting) return;
    let alive = true;
    const tick = () =>
      fetch(`${base}/api/profile/status`)
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => alive && s?.progress && setProgress(String(s.progress)))
        .catch(() => {});
    tick();
    const id = window.setInterval(tick, 1500);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [collecting, base]);
  /* One at a time: a reload or a new tab drops any job left over from the old page, and closing the page
     does the same, so the collector is never stuck "busy" with nobody watching. */
  useEffect(() => {
    const reset = () => {
      fetch(`${base}/api/profile/reset`, { method: "POST", keepalive: true }).catch(() => {});
    };
    reset();
    window.addEventListener("pagehide", reset);
    return () => window.removeEventListener("pagehide", reset);
  }, [base]);
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
    if (!response.ok) {
      const error = new Error(typeof data.detail === "string" ? data.detail : "That did not work.");
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return data;
  };
  const analyze = async (limit: number) => {
    setWorking(true);
    setCollecting(true);
    setCancelling(false);
    setRetry(null);
    setLog([]);
    setNow(Date.now());
    setProgress("Opening the collection browser…");
    setMsg("");
    try {
      const data = await call("analyze", { url: url.trim(), limit, max_comments: settings.comments, replies: settings.replies }, 180000 + 45000 * limit);
      if (data.schema_version !== 2) throw new Error("Unsupported analysis schema; version 2 required.");
      onAnalyzed(data, url.trim().replace(/^https?:\/\/(www\.)?/, ""));
    } catch (e) {
      const status = (e as Error & { status?: number }).status;
      if (status === 409 && e instanceof Error && /cancelled/i.test(e.message)) {
        setMsg("Cancelled. Nothing was kept.");
      } else if (e instanceof Error && e.name === "TimeoutError") {
        setMsg("That took too long.");
        setRetry({ limit, smaller: limit > 5 });
      } else {
        setMsg(e instanceof Error ? e.message : "That did not work.");
        // A wrong link or a sign-in problem will not fix itself; other failures are worth another try.
        if (status !== 422 && status !== 401 && status !== 404) setRetry({ limit, smaller: status === 504 && limit > 5 });
      }
    } finally {
      setWorking(false);
      setCollecting(false);
      setCancelling(false);
    }
  };
  const cancel = async () => {
    setCancelling(true);
    try {
      await call("cancel");
    } catch {
      /* the collection result still arrives; nothing else to do */
    }
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
    <section aria-labelledby="profile-link-title" className="mt-6 border-t border-border-default pt-5 text-sm">
      <h3 id="profile-link-title" className="mb-3 font-semibold text-ink">
        Analyze a profile link (this computer only)
      </h3>
      <div className="space-y-3">
        <div role="note" className="profile-warning flex items-start gap-3 rounded-2xl p-4 text-slate-700">
          <TriangleAlert size={18} strokeWidth={2} aria-hidden="true" className="mt-0.5 shrink-0 text-orange" />
          <p>
            <strong className="font-semibold text-ink">Use this responsibly.</strong> Only analyze your own
            profile, or one you have permission to analyze, and follow each platform’s rules. Do not use it
            to collect data in bulk or to track other people. It reads posts through a browser on this
            computer, and you sign in in that window, never inside Speculara. Nothing is sent to a server. The result stays in this browser, even after a reload, until you click Clear data.
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(!detected || detected === "tiktok") && (
              <span className="network-ok inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-ink">
                <TikTokLogo />
                TikTok supported
                <span className="text-xs font-normal text-slate-600">no sign in needed</span>
              </span>
            )}
            {(["instagram", "facebook"] as const)
              .filter((n) => !detected || detected === n)
              .map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy || signingIn}
                  onClick={() =>
                    run(async () => {
                      const r = await call("login", { network: n });
                      setSigningIn(true);
                      setMsg(r.message ?? "Sign in in the browser window, then click Done signing in.");
                    })
                  }
                  className="ctl inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-ink"
                >
                  {n === "instagram" ? <InstagramLogo /> : <FacebookLogo />}
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
                    setMsg("Signed in. Now analyze the profile.");
                  })
                }
                className="btn-primary min-h-11 rounded-xl px-3 font-semibold"
              >
                Done signing in
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600">
            {detected === "facebook"
              ? "Facebook only shows posts to signed in people, so sign in once first. The browser remembers it for next time."
              : detected === "tiktok"
                ? "TikTok profiles are read without signing in."
                : detected === "instagram"
                ? "Optional. Post counts load without signing in. Sign in once to also read comment text."
                : "Facebook needs a sign in. Instagram only needs one for comment text. TikTok needs none."}
          </p>
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
        <fieldset className="space-y-2">
          <legend className="mb-2 block font-semibold text-ink">How thorough should it be?</legend>
          <div role="group" aria-label="Speed preset" className="grid gap-2 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset?.id === p.id}
                disabled={busy}
                onClick={() => setSettings(p.s)}
                className="ctl cx-pill flex min-h-14 flex-col items-start justify-center rounded-xl px-3 py-2 text-left"
              >
                <span className="font-semibold text-ink">{p.label}</span>
                <span className="text-xs text-slate-600">{p.note}</span>
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-700" aria-live="polite">
            <span className="font-semibold text-ink">{preset ? preset.label : "Custom"}:</span> {settings.posts} posts,{" "}
            {settings.comments === 0 ? "no comments" : settings.comments === ALL_COMMENTS ? "every comment" : `up to ${settings.comments} comments each`}
            {settings.comments > 0 && (settings.replies ? ", with replies" : ", no replies")}. Takes {estimate(settings)}.
          </p>
          <button
            type="button"
            aria-expanded={tune}
            aria-controls="collect-tune"
            onClick={() => setTune((t) => !t)}
            className="cx-link"
          >
            {tune ? "Hide fine tuning" : "Fine tune"}
          </button>
          {tune && (
            <div id="collect-tune" className="well grid gap-3 rounded-xl p-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-ink" htmlFor="post-count">
                Posts to read
                <select
                  id="post-count"
                  value={settings.posts}
                  disabled={busy}
                  onChange={(e) => setSettings({ ...settings, posts: Number(e.target.value) })}
                  className="well mt-1 block min-h-11 w-full rounded-xl bg-transparent px-3 text-sm font-normal"
                >
                  {POST_CHOICES.map((n) => (
                    <option key={n} value={n}>
                      Latest {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-ink" htmlFor="comment-cap">
                Comments
                <select
                  id="comment-cap"
                  value={settings.comments}
                  disabled={busy}
                  onChange={(e) => setSettings({ ...settings, comments: Number(e.target.value) })}
                  className="well mt-1 block min-h-11 w-full rounded-xl bg-transparent px-3 text-sm font-normal"
                >
                  {COMMENT_CHOICES.map(([n, label]) => (
                    <option key={n} value={n}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm text-ink sm:col-span-2">
                <input
                  type="checkbox"
                  checked={settings.replies && settings.comments > 0}
                  disabled={busy || settings.comments === 0}
                  onChange={(e) => setSettings({ ...settings, replies: e.target.checked })}
                  className="size-4 accent-[var(--color-orange)]"
                />
                <span>
                  <span className="font-semibold">Include replies to comments</span>
                  <span className="block text-xs text-slate-600">TikTok only. Turning it off is faster.</span>
                </span>
              </label>
              <p className="text-xs text-slate-600 sm:col-span-2">
                Fewer posts and fewer comments finish sooner and put less load on the platform. The time shown is a rough guide; it depends on how many comments your posts really have.
              </p>
            </div>
          )}
        </fieldset>
        <button
          type="button"
          disabled={busy || signingIn || url.trim().length < 3}
          onClick={() => analyze(settings.posts)}
          className="btn-primary min-h-11 w-full rounded-xl px-4 font-semibold"
        >
          Analyze this profile
        </button>
        {collecting && (
          <div ref={progressRow} className="run-card relative overflow-hidden rounded-2xl p-5">
            <div className="run-bar" aria-hidden="true" data-idle={cancelling || undefined} />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="run-ring" aria-hidden="true" data-idle={cancelling || undefined} />
                <div>
                  <p className="font-semibold leading-tight text-ink">Reading the profile</p>
                  <p className="text-xs text-slate-600">
                    {log.length} {log.length === 1 ? "step" : "steps"} so far
                  </p>
                </div>
              </div>
              <span className="run-pill text-xs font-medium tabular-nums text-ink" aria-hidden="true">
                {fmtElapsed(now - (log[0]?.at ?? now))}
              </span>
            </div>
            <ol ref={logList} aria-label="Activity log" className="run-list mt-4 max-h-56 overflow-y-auto pr-2">
              {log.map((entry, i) => {
                const last = i === log.length - 1;
                const active = last && !cancelling;
                return (
                  <li
                    key={`${entry.at}-${i}`}
                    aria-current={last ? "step" : undefined}
                    className={`run-step ${active ? "is-active" : "is-done"}`}
                  >
                    <span className="run-node" aria-hidden="true">
                      {active ? <span className="log-dot size-2 rounded-full bg-orange" /> : <Check size={12} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm leading-snug">{entry.text}</span>
                    <span className="shrink-0 pt-0.5 text-xs tabular-nums text-slate-600">
                      {fmtElapsed(entry.at - log[0].at)}
                    </span>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-default pt-4">
              <p role="status" className="min-w-0 flex-1 text-xs text-slate-600">
                {cancelling
                  ? "Cancelling. The browser is closing…"
                  : "Keep this window open. Large profiles can take several minutes."}
              </p>
              <button
                type="button"
                disabled={cancelling}
                onClick={cancel}
                className="ctl min-h-11 rounded-xl px-3 font-semibold text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {!collecting && msg && (
          <p role="status" className="text-slate-700">
            {msg}
          </p>
        )}
        {!collecting && retry && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => analyze(retry.limit)} className="ctl min-h-11 rounded-xl px-3 font-semibold text-ink">
              Try again
            </button>
            {retry.smaller && (
              <button type="button" onClick={() => analyze(5)} className="ctl min-h-11 rounded-xl px-3 font-semibold text-ink">
                Try with fewer posts (5)
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/* While the AI writes, the notice cycles through playful action words so waiting feels alive. */
const THINKING_PHRASES = [
  "Untangling numbers",
  "Reading the bars",
  "Chasing the trend",
  "Weighing evidence",
  "Connecting dots",
  "Sifting the signal",
  "Squinting at totals",
  "Sharpening insight",
  "Counting twice",
  "Distilling facts",
  "Tuning the forecast",
  "Following clues",
  "Dusting off charts",
  "Stitching it together",
  "Hunting the why",
  "Polishing the answer",
];
function ThinkingPhrase() {
  const [i, setI] = useState(() => Math.floor(Math.random() * THINKING_PHRASES.length));
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % THINKING_PHRASES.length), 2200);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="min-w-0 flex-1">
      <span key={i} className="focus-in ai-blink block truncate" aria-hidden="true">
        {THINKING_PHRASES[i]}…
      </span>
      <span className="sr-only">The assistant is writing your answer</span>
    </span>
  );
}

/* ---------- Chatbot ---------- */
function Chat() {
  const analysis = useContext(Results);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<{ me: boolean; t: string; ai?: boolean; note?: string }[]>([
    {
      me: false,
      t: "Ask what changed, what it means, or what to try next. I use only the data you uploaded.",
    },
  ]);
  const messages = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  /* The mascot notices the pointer within 300px: it turns alert, its eyes follow, its tail wags. */
  useEffect(() => {
    const el = launcher.current;
    if (!el) return;
    const track = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) > 300) {
        el.removeAttribute("data-alert");
        el.style.setProperty("--tx", "0");
        el.style.setProperty("--ty", "0");
        return;
      }
      el.setAttribute("data-alert", "");
      el.style.setProperty("--tx", String(Math.max(-1, Math.min(1, dx / 110))));
      el.style.setProperty("--ty", String(Math.max(-1, Math.min(1, dy / 110))));
    };
    const leave = () => el.removeAttribute("data-alert");
    window.addEventListener("pointermove", track);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", track);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);
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
  /* AI answers are the default whenever the server enables them. While one is being written the person can
     switch to the built-in answer at once instead of waiting. */
  const [aiAvailable, setAiAvailable] = useState(false);
  const [thinking, setThinking] = useState(false);
  const pending = useRef<{ controller: AbortController; skipped: boolean } | null>(null);
  /* Suggested questions scroll sideways; arrows appear on hover when there is more to reveal. */
  const chips = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const updateArrows = () => {
    const el = chips.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  const scrollChips = (dir: -1 | 1) => {
    const el = chips.current;
    if (el) el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.6), behavior: "smooth" });
  };
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(updateArrows);
    window.addEventListener("resize", updateArrows);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", updateArrows);
    };
  }, [open, analysis]);
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
    /* The built-in answer: instant, works offline, and is what the person gets if they skip the wait. */
    const standard = () =>
      analysis
        ? plainChat(answer(t, analysis))
        : "Upload a dataset or load the labeled synthetic demo first. No social account is connected.";
    if (aiAvailable) {
      const controller = new AbortController();
      const job = { controller, skipped: false };
      pending.current = job;
      setThinking(true);
      const timeout = window.setTimeout(() => controller.abort(), 130000);
      try {
        /* Only a summary goes out: never the rows, post links or comments. With no data loaded it is empty. */
        const summary = analysis ? (({ preview: _p, post_references: _r, data_table: _t, profile: _pr, ...rest }) => rest)(analysis) : {};
        const response = await fetch(`${apiBase}/api/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: t, analysis: summary }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("ai");
        const { answer: aiAnswer } = await response.json();
        setMsgs((m) => [...m, { me: false, ai: true, t: plainChat(String(aiAnswer)) }]);
      } catch {
        setMsgs((m) => [
          ...m,
          job.skipped
            ? { me: false, t: standard() }
            : { me: false, note: "AI did not respond, standard answer", t: `That did not load, so here is the standard answer instead. ${standard()}` },
        ]);
      } finally {
        window.clearTimeout(timeout);
        if (pending.current === job) pending.current = null;
        setThinking(false);
      }
      return;
    }
    setMsgs((m) => [...m, { me: false, t: standard() }]);
  };
  const skipToStandard = () => {
    const job = pending.current;
    if (!job) return;
    job.skipped = true;
    job.controller.abort();
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
          className={`ios-sheet flex h-[min(34rem,calc(100dvh-6.5rem))] w-[calc(100vw-1.5rem)] flex-col overflow-hidden sm:w-[24rem] ${closing ? "popover-out" : "popover-in"}`}
        >
          <div className="relative flex shrink-0 items-center gap-3 px-4 pb-3 pt-4 pr-16 [@media(max-height:560px)]:pb-1 [@media(max-height:560px)]:pt-2">
            <span className="relative grid h-12 w-12 [@media(max-height:560px)]:h-9 [@media(max-height:560px)]:w-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-zinc-600/80 to-zinc-800 ring-1 ring-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
              <Logo variant="mark" size={26} />
              {aiAvailable && (
                <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green ring-2 ring-zinc-800" />
              )}
            </span>
            <div className="flex items-center gap-2">
              <p className="text-[19px] font-semibold leading-none tracking-tight text-ink">Ask Speculara</p>
              {aiAvailable && (
                <span aria-label="AI answers on" className="rounded-md bg-orange-fill/15 px-2 py-1 text-[12px] font-bold leading-none tracking-wide text-orange-fill ring-1 ring-orange-fill/30">
                  AI
                </span>
              )}
            </div>
            <button
              onClick={close}
              aria-label="Close chat"
              className="absolute right-2 top-1.5 grid h-11 w-11 place-items-center rounded-full text-ink transition-colors hover:bg-white/10"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </span>
            </button>
          </div>
          <div
            ref={messages}
            className="neu-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3.5 py-2 text-[15px] leading-snug"
            aria-live="polite"
          >
            {msgs.map((m, i) => (
              <div key={i} className={`focus-in flex ${m.me ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[84%] whitespace-pre-line break-words rounded-[20px] px-3.5 py-2 shadow-sm ${m.me ? "rounded-br-md bg-orange-fill text-neutral-950" : "rounded-bl-md bg-white/[0.12] text-ink ring-1 ring-white/10"}`}
                >
                  {m.t}
                  {!m.me && m.t !== msgs[0].t && (
                    <span
                      className={`mt-1 flex items-center gap-1 text-[10.5px] font-medium leading-none ${m.ai ? "text-orange-fill" : "text-slate-600"}`}
                      title={m.ai ? "Written by AI" : (m.note ?? "Built-in answer, not AI")}
                    >
                      {m.ai ? <Sparkles className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" /> : <Calculator className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />}
                      {m.ai ? "AI generated" : (m.note ?? "Standard answer")}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div role="status" className="flex min-w-0 justify-start">
                <div className="flex min-w-0 max-w-full items-center gap-2.5 rounded-full bg-white/[0.12] py-1.5 pl-3 pr-2 text-[13px] text-slate-700 ring-1 ring-white/10">
                  <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </span>
                  <ThinkingPhrase />
                  <button
                    type="button"
                    onClick={skipToStandard}
                    className="relative shrink-0 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-ink transition-colors after:absolute after:-inset-3 after:content-[''] hover:bg-white/20"
                  >
                    Standard answer
                  </button>
                </div>
              </div>
            )}
          </div>
          {aiAvailable && (
            <p className="mx-4 mb-1 shrink-0 text-xs leading-snug text-slate-600">
              Answers use a summary of your results (totals, relationships, forecasts). Your rows, post links and comments are never sent.
            </p>
          )}
          <div className="group/chips relative shrink-0">
            <div
              ref={chips}
              role="group"
              aria-label="Suggested questions"
              onScroll={updateArrows}
              className="no-bar flex gap-1.5 overflow-x-auto scroll-smooth px-3.5 pb-0.5 pt-0"
            >
              {quickQuestions.map(({ label, question }) => (
                <button key={question} onClick={() => send(question)} className="group/chip min-h-11 shrink-0 active:scale-95 transition-transform">
                  {/* The button keeps a 44px touch target; the visible chip is slim. */}
                  <span className="block rounded-full px-3 py-1 text-[12.5px] font-normal leading-5 text-slate-700 ring-1 ring-white/15 transition-colors group-hover/chip:bg-white/10 group-hover/chip:text-ink">
                    {label}
                  </span>
                </button>
              ))}
            </div>
            {(["left", "right"] as const).map((side) => {
              const show = side === "left" ? canLeft : canRight;
              const Chevron = side === "left" ? ChevronLeft : ChevronRight;
              return (
                <button
                  key={side}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={() => scrollChips(side === "left" ? -1 : 1)}
                  className={`absolute top-1/2 hidden h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-zinc-800/90 text-ink opacity-0 shadow-md ring-1 ring-white/20 backdrop-blur transition-opacity duration-150 hover:bg-zinc-700 ${side === "left" ? "left-1.5" : "right-1.5"} ${show ? "!grid group-hover/chips:opacity-100" : ""}`}
                >
                  <Chevron className="h-4 w-4" strokeWidth={2.4} />
                </button>
              );
            })}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
            className="shrink-0 px-3 pb-2"
          >
            <div className="flex items-center gap-1 rounded-full bg-white/10 py-1 pl-4 pr-1 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-white/60">
              <input
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask Speculara"
                aria-label="Your question"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-600"
                style={{ outline: "none" }}
              />
              <button
                aria-label="Send"
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-fill text-neutral-950 transition-all duration-150 active:scale-90 ${text.trim() ? "opacity-100" : "opacity-40"}`}
              >
                <ArrowUp className="h-5 w-5" strokeWidth={2.6} />
              </button>
            </div>
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
        className="bot3d-launcher grid h-16 w-16 place-items-center rounded-full active:scale-95"
      >
        <ChatBotIcon className="block h-14 w-14" />
      </button>
    </div>
  );
}

/* ---------- Saved dataset ----------
   The last dataset stays in this browser (never sent anywhere) so a reload does not lose it.
   It is removed only when the person clicks Clear data. */
const SAVED_KEY = "speculara:dataset:v1";
type SavedDataset = { analysis: Analysis; source: { label: string; demo: boolean } | null; updatedAt: number | null };
function loadSaved(): SavedDataset | null {
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedDataset;
    return saved?.analysis?.schema_version === 2 ? saved : null;
  } catch {
    return null;
  }
}
function writeSaved(saved: SavedDataset | null) {
  try {
    if (saved) window.localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    else window.localStorage.removeItem(SAVED_KEY);
  } catch {
    /* storage full or blocked: the dataset still works for this visit, it just will not survive a reload */
  }
}

/* ---------- App ---------- */
export default function App() {
  const [saved] = useState(loadSaved);
  const [picked, setPicked] = useState<Key | null>(saved ? "recommend" : null);
  const [tab, setTab] = useState<Key | null>(saved ? "charts" : null);
  const [err, setErr] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(saved?.analysis ?? null);
  /* The hero dashboard measures the synthetic demo until a dataset is loaded. It is separate from the dataset
     the modules use, never replaces it, and is skipped in automated browsers (add ?preview=1 to force it). */
  const [preview, setPreview] = useState<{ data: Analysis; label: string } | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "ready">("idle");
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("preview") === "1";
    if (navigator.webdriver && !forced) return;
    let alive = true;
    setPreviewState("loading");
    (async () => {
      try {
        const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
        const csv = await fetch("/demo/speculara-synthetic.csv");
        if (!csv.ok) throw new Error("demo");
        const res = await fetch(`${base}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream", "X-Filename": "upload.csv" },
          body: await csv.blob(),
          signal: AbortSignal.timeout(60000),
        });
        const data = await res.json();
        if (alive && res.ok && data.schema_version === 2) {
          setPreview({ data, label: "Synthetic demo" });
          setPreviewState("ready");
        } else if (alive) setPreviewState("idle");
      } catch {
        if (alive) setPreviewState("idle");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const [source, setSource] = useState<{ label: string; demo: boolean } | null>(saved?.source ?? null);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  /* The rail follows the module card on screen: which one is crossing the middle of the window, or none. */
  const [inView, setInView] = useState<Key | null>(null);
  /* Only modules that have a card on the page get an icon, in page order. */
  const [present, setPresent] = useState<Key[]>([]);
  /* After a click on the rail the droplet goes straight to that icon and ignores the cards passed on the way. */
  const railLock = useRef(0);
  /* The rail shows only from the first module card to the last one, gaps between them included. */
  const [railOn, setRailOn] = useState(false);
  useEffect(() => {
    let raf = 0;
    const find = () => {
      raf = 0;
      const mid = window.innerHeight * 0.45;
      let hit: Key | null = null;
      const here: Key[] = [];
      for (const el of document.querySelectorAll<HTMLElement>("[data-module]")) {
        here.push(el.dataset.module as Key);
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) hit = el.dataset.module as Key;
      }
      /* Keep the last module when the middle of the window is between two cards, so the rail never unmounts mid scroll. */
      if (hit && Date.now() > railLock.current) setInView((prev) => (prev === hit ? prev : hit));
      const els = document.querySelectorAll<HTMLElement>("[data-module]");
      const on = els.length > 0 && els[0].getBoundingClientRect().top <= mid && els[els.length - 1].getBoundingClientRect().bottom >= mid;
      setRailOn((prev) => (prev === on ? prev : on));
      setPresent((prev) => (prev.join() === here.join() ? prev : here));
    };
    const onMove = () => {
      if (!raf) raf = requestAnimationFrame(find);
    };
    find();
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    const mo = new MutationObserver(onMove);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  const [dragging, setDragging] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(saved?.updatedAt ?? null);
  /* Keep the dataset across reloads; Clear data (analysis becomes null) removes it. */
  useEffect(() => {
    writeSaved(analysis ? { analysis, source, updatedAt } : null);
  }, [analysis, source, updatedAt]);
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
          JSON.stringify({ source, ...(({ data_table: _t, profile: pr, ...rest }) => ({ ...rest, profile: pr ? { ...pr, avatar: undefined } : undefined }))(analysis) }, null, 2),
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

  const colors = [INK, WINE, INK, WINE, INK, WINE];
  const locked = !analysis || busy;

  return (
    <Results.Provider value={analysis}>
      <Splash />
      <EdgeBlur />
      <div className="min-h-screen pb-24">
        <main id="main">
          <ResponsiveHeroBanner
            onCtaClick={() => void loadDemo()}
            onPrimaryClick={() => void loadDemo()}
            onSecondaryClick={() => {
              document.getElementById("start")?.scrollIntoView({ behavior: "smooth", block: "center" });
              document.getElementById("upload")?.focus({ preventScroll: true });
            }}
            aside={
              <DashboardPreview
                analysis={analysis ?? preview?.data ?? null}
                sourceLabel={analysis ? (source?.label ?? "Your data") : (preview?.label ?? "")}
                state={analysis || preview ? "ready" : previewState}
              />
            }
          />
          <div className="mx-auto max-w-[var(--layout-app)] px-[var(--layout-gutter)]">
          <section id="data" aria-label="Add your data" className="scroll-mt-6 pb-16 pt-14 sm:pb-20">
        <div ref={listRef} id="start" className="upload-card mx-auto min-w-0 max-w-3xl scroll-mt-6 rounded-3xl p-5 sm:p-8">
          <div className="relative flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="upload-eyebrow">Step 1</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.03em] text-ink">
                Start with your data
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-700">
                Add a spreadsheet of your posts, such as a CSV or Excel file with dates, views, likes or sales. Speculara reads it on your device, shows which questions your data can answer, and explains each result in plain words.
              </p>
            </div>
            <span className="chip inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" aria-hidden="true">
              <Lock size={13} strokeWidth={2} />
              Never saved
            </span>
          </div>
          <div className="relative mt-6" aria-busy={busy}>
            <label htmlFor="upload" className="sr-only">
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
              className={`upload-zone ${dragging ? "is-dragging" : ""} ${busy ? "is-busy" : ""}`}
            >
              <span className="upload-zone__icon" aria-hidden="true">
                <CloudUpload size={26} strokeWidth={1.6} />
              </span>
              <p className="font-display text-xl text-ink">
                {dragging ? "Release to upload" : "Drop a CSV or XLSX file here"}
              </p>
              <p className="mt-1 text-sm text-slate-600">or choose one from your computer</p>
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
                className="upload-input mt-5"
              />
              <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-hidden="true">
                {["CSV (UTF-8)", "XLSX first sheet", "5 MB", "20,000 rows", "50 columns"].map((spec) => (
                  <li key={spec} className="upload-spec">
                    {spec}
                  </li>
                ))}
              </ul>
            </div>
            <p id="upload-help" className="sr-only">
              CSV (UTF-8) or XLSX first sheet. Up to 5 MB, 20,000 rows, 50 columns. Processed in server
              memory and never saved.
            </p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-600" aria-hidden="true">
              <ShieldCheck size={14} strokeWidth={1.8} />
              Processed in server memory and never saved.
            </p>
            <p id="upload-msg" className="mt-2 text-sm text-wine" role="alert">
              {err}
            </p>
            {busy && (
              <p role="status" className="mt-2 text-sm font-semibold text-ink">
                {loadingMessage}
              </p>
            )}
            <div className="upload-or" aria-hidden="true">
              <span>or</span>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadDemo()}
              className="ctl upload-demo min-h-12 w-full text-sm font-semibold text-ink"
            >
              <Sparkles size={16} strokeWidth={1.9} aria-hidden="true" />
              Try synthetic demo data
            </button>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
              <span className="text-slate-600">Sample files</span>
              {[
                ["/demo/speculara-synthetic.csv", "Demo CSV"],
                ["/demo/speculara-synthetic.xlsx", "Demo XLSX"],
                ["/demo/speculara-text-synthetic.csv", "Text-only demo"],
              ].map(([href, label]) => (
                <a key={href} href={href} download className="upload-sample">
                  <Download size={13} strokeWidth={1.9} aria-hidden="true" />
                  {label}
                </a>
              ))}
            </div>
            <ProfileLink
              disabled={busy}
              onAnalyzed={(data, label) => {
                setErr("");
                setNotice("");
                setCandidate({ data, label });
              }}
            />
          </div>
        </div>
          </section>


          {candidate && (
            <section
              aria-labelledby="upload-preview-title"
              className="surface focus-in mb-10 min-w-0 rounded-3xl p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="upload-preview-title" tabIndex={-1} className="font-display text-2xl font-bold text-ink">
                  Upload preview
                </h2>
                <p className="chip px-3 py-1.5 text-sm">
                  <strong className="font-semibold text-ink">{candidate.data.rows.toLocaleString()}</strong> rows to review
                </p>
              </div>
              {candidate.data.source_kind === "synthetic" && (
                <p className="mt-2 text-sm font-semibold text-wine">Synthetic demo: fictional records</p>
              )}
              <div className="mt-6 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
                <div className="min-w-0 space-y-6">
                  <ProfileHeader analysis={candidate.data} label={candidate.label} />
                  <CollectionFacts analysis={candidate.data} />
                  <div>
                    <h3 className="mb-3 font-display text-lg font-bold text-ink">
                      {candidate.data.data_table ? "Latest posts" : "First rows"}
                    </h3>
                    <PreviewRows analysis={candidate.data} />
                  </div>
                  <p className="text-sm text-slate-600">
                    Detected columns: {(candidate.data.preview?.columns ?? candidate.data.columns).join(", ")}. Your current
                    results stay unchanged until you confirm.
                  </p>
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-ink">What this file supports</h3>
                  <ul className="mt-3 grid gap-2.5">
                    {ORDER.map((key) => {
                      const info = moduleInfo(key, candidate.data);
                      return (
                        <li key={key} className="flex min-w-0 items-start gap-3 rounded-2xl bg-ink/[0.06] p-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink/10 text-ink">
                            <Icon name={key} size="md" />
                          </span>
                          <div className="min-w-0 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-ink">{META[key].tab}</span>
                              <StatusBadge module={key} analysis={candidate.data} />
                            </div>
                            <p className="mt-1 break-words text-slate-700">
                              <Emphasis text={info.needed ?? info.finding} />
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border-default pt-6">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => commitDataset(candidate.data, candidate.label)}
                  className="btn-primary min-h-11 rounded-xl px-5 text-sm"
                >
                  Use this dataset
                </button>
                <DownloadButtons analysis={candidate.data} label={candidate.label} />
                <button
                  type="button"
                  onClick={() => {
                    setCandidate(null);
                    document.getElementById("upload")?.focus();
                  }}
                  className="ctl min-h-11 rounded-xl px-4 text-sm text-ink sm:ml-auto"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          <section id="questions" aria-labelledby="modules-title" className="scroll-mt-6 border-t border-border-default py-16 sm:py-20">
            <h2 id="modules-title" className="font-display text-4xl font-extrabold tracking-[-0.04em] text-ink md:text-5xl">
              What do you want to know?
            </h2>
            <p className="mt-1 text-slate-600">Pick a question. Each one turns your numbers into a plain answer.</p>
            {nudge && analysis && (analysis.profile || analysis.provenance) ? (
              <div role="status" className="surface mt-5 rounded-2xl p-4">
                <ProfileHeader analysis={analysis} label={source?.label ?? ""} />
                <p className="mt-3 text-sm font-semibold text-ink">Choose any module to explore.</p>
                <DownloadButtons analysis={analysis} label={source?.label ?? "data"} className="mt-3" />
              </div>
            ) : (
              nudge && (
                <p role="status" className="chip mt-4 inline-block px-3 py-2 text-sm">
                  Analyzed {source?.label}. Choose any module to explore.
                </p>
              )
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
                        () =>
                          (document.querySelector(`[data-module="${k}"]`) ?? document.getElementById("result"))?.scrollIntoView({
                            behavior: "smooth",
                          }),
                        50,
                      );
                    }}
                    className={`ctl flex h-full min-h-[var(--size-target)] w-full flex-col items-start gap-3 rounded-2xl p-4 text-left disabled:opacity-80 ${picked === k ? "is-selected" : ""} ${locked ? "border-dashed !bg-transparent" : ""} ${!locked && analysis && moduleInfo(k, analysis).status === "Needs more data" ? "module-unused" : ""}`}
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

          {analysis && present.length > 0 && (() => {
            const items = ORDER.filter((k) => present.includes(k));
            const index = inView ? items.indexOf(inView) : -1;
            if (!items.length) return null;
            return (
              <nav aria-label="Modules" className="module-rail" data-hidden={railOn ? undefined : true} aria-hidden={railOn ? undefined : true} style={{ ["--i" as string]: Math.max(0, index) }}>
                <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
                  <filter id="rail-goo" colorInterpolationFilters="sRGB">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                    <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" />
                  </filter>
                </svg>
                <span className="module-rail__drop" data-on={index >= 0 || undefined} aria-hidden="true">
                  <span className="module-rail__tail" />
                  <span className="module-rail__head" />
                </span>
                {items.map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={inView === k}
                    aria-label={`Go to ${META[k].tab}`}
                    title={META[k].tab}
                    onClick={() => {
                      setInView(k); /* the droplet starts moving at once and the rail stays mounted */
                      railLock.current = Date.now() + 1400;
                      window.setTimeout(() => window.dispatchEvent(new Event("scroll")), 1450);
                      const card = document.querySelector<HTMLElement>(`[data-module="${k}"]`);
                      card?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`module-rail__btn ${inView === k ? "is-active" : ""} ${moduleInfo(k, analysis).status === "Needs more data" ? "opacity-60" : ""}`}
                  >
                    <Icon name={k} size="md" />
                    <span className="module-rail__tip" aria-hidden="true">
                      {META[k].tab}
                    </span>
                  </button>
                ))}
              </nav>
            );
          })()}

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
                    {source?.demo ? "Synthetic demo: fictional records" : analysis.provenance ? "Collected profile" : "Uploaded dataset"}:{" "}
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
            {analysis && !locked ? (
              <div className="grid gap-12">
                {ORDER.map((k) => {
                  const V = VIEWS[k];
                  return (
                    <section key={k} aria-label={META[k].title} data-module={k} className="min-w-0 scroll-mt-24">
                      <h2 className="sr-only">{META[k].title}</h2>
                      <div className="result-arrive">
                        <V key={`module-${k}-${revision}-${viewRevision}`} />
                      </div>
                    </section>
                  );
                })}
              </div>
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
        <footer className="border-t border-border-default">
          <div className="mx-auto flex max-w-[var(--layout-app)] flex-wrap items-center justify-between gap-3 px-[var(--layout-gutter)] py-8 text-sm text-slate-600">
            <Logo size={24} />
            <p>Demo records are fictional.</p>
          </div>
        </footer>
        <Chat key={revision} />
      </div>
    </Results.Provider>
  );
}
