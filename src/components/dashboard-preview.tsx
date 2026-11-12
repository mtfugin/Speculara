/* A live dashboard built from a real analysis: the three headline counts with their week-over-week change and a
   trend line, one daily chart with hover values, and the next-week estimate. Nothing here is mocked: it reads the
   same analysis object the modules use, so it measures whatever dataset is loaded (the synthetic demo until you add yours). */
import { useRef, useState } from "react";
import { Icon } from "@/design-system/Icon";
import { RollingNumber } from "@/design-system/RollingNumber";
import { niceMax } from "@/chart-presentation";
import type { Analysis, Metric } from "@/analysis";

const KPI_ORDER: Metric[] = ["views", "saves", "sales", "likes", "comments"];
const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 0 });
const compact = (v: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(v);
const shortDate = (label: string) => {
  const d = new Date(`${label}T00:00:00Z`);
  return Number.isNaN(d.valueOf()) ? label : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(d);
};

function series(a: Analysis, metric: Metric): { label: string; value: number }[] {
  return (a.charts.date ?? [])
    .map((row) => ({ label: row.label, value: row[metric] }))
    .filter((p): p is { label: string; value: number } => typeof p.value === "number");
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${26 - ((v - min) / span) * 22}`);
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-2 h-7 w-full" aria-hidden="true" focusable="false">
      <polyline points={pts.join(" ")} fill="none" stroke="var(--color-orange)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Delta({ a, metric }: { a: Analysis; metric: Metric }) {
  const p = a.periods?.[metric];
  if (!p?.available || p.absolute_change == null) return <span className="mt-1 block text-xs text-slate-600">Week change needs two full weeks</span>;
  const up = p.absolute_change > 0;
  const flat = p.absolute_change === 0;
  const pct = p.percent_change == null ? "" : ` (${Math.abs(p.percent_change).toFixed(1)}%)`;
  return (
    <>
      <span className={`mt-1 flex items-center gap-1 text-xs font-semibold ${flat ? "text-slate-600" : up ? "text-green" : "text-wine"}`}>
        <Icon name={flat ? "flat" : up ? "up" : "down"} size="sm" />
        {flat ? "No change" : `${up ? "+" : "-"}${fmt(Math.abs(p.absolute_change))}${pct}`}
      </span>
      <span className="block text-[11px] text-slate-600">vs last week</span>
    </>
  );
}

function TrendChart({ points, metric }: { points: { label: string; value: number }[]; metric: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const W = 320;
  const H = 120;
  const max = niceMax(Math.max(1, ...points.map((p) => p.value)));
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1)} ${H} L${x(0)} ${H} Z`;
  const peak = points.reduce((m, p, i) => (p.value > points[m].value ? i : m), 0);
  const active = hover ?? peak;
  const label = `${metric} by day, ${shortDate(points[0].label)} to ${shortDate(points[points.length - 1].label)}. Highest ${shortDate(points[peak].label)}: ${fmt(points[peak].value)}.`;
  const onMove = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  return (
    <div className="tabular">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{metric[0].toUpperCase() + metric.slice(1)} by day</p>
        <p className="text-xs text-slate-600">
          {shortDate(points[active].label)} <span className="font-semibold text-ink">{fmt(points[active].value)}</span>
        </p>
      </div>
      <div ref={box} className="relative mt-2" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[132px] w-full" role="img" aria-label={label} focusable="false" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--color-orange)" stopOpacity="0.32" />
              <stop offset="1" stopColor="var(--color-orange)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((t) => (
            <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke="var(--color-line)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} fill="url(#trend-fill)" />
          <path d={line} fill="none" stroke="var(--color-orange)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1={x(active)} x2={x(active)} y1="0" y2={H} stroke="var(--color-line-strong)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
        {/* the marker is an HTML dot so it stays round while the svg stretches */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange bg-canvas"
          style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(points[active].value) / H) * 100}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-600">
        <span>{shortDate(points[0].label)}</span>
        <span>{compact(max)} max</span>
        <span>{shortDate(points[points.length - 1].label)}</span>
      </div>
    </div>
  );
}

export default function DashboardPreview({
  analysis,
  sourceLabel,
  state,
}: {
  analysis: Analysis | null;
  sourceLabel: string;
  state: "idle" | "loading" | "ready";
}) {
  const kpis = analysis ? KPI_ORDER.filter((m) => analysis.totals[m] != null).slice(0, 3) : [];
  const main = analysis ? KPI_ORDER.find((m) => series(analysis, m).length >= 3) : undefined;
  const points = analysis && main ? series(analysis, main).slice(-30) : [];
  const forecast = analysis?.predict.available ? analysis.predict : null;

  return (
    <section aria-label="Live dashboard" data-dashboard className="overlay min-w-0 rounded-3xl p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2 w-2 rounded-full bg-orange" aria-hidden="true" />
          Dashboard
        </p>
        <p className="truncate text-xs text-slate-600">
          {analysis ? `${sourceLabel} · ${analysis.rows.toLocaleString()} rows` : state === "loading" ? "Measuring…" : "No data yet"}
        </p>
      </div>

      {analysis && kpis.length > 0 ? (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {kpis.map((m) => (
              <div key={m} className="tabular min-w-0 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
                <dt className="text-xs capitalize text-slate-600">{m}</dt>
                <dd className="min-w-0">
                  <span className="mt-0.5 block truncate font-sans text-xl font-semibold tracking-tight text-ink sm:text-2xl"><RollingNumber value={fmt(analysis.totals[m]!)} key={fmt(analysis.totals[m]!)} /></span>
                  <Delta a={analysis} metric={m} />
                  <Sparkline values={series(analysis, m).slice(-14).map((p) => p.value)} />
                </dd>
              </div>
            ))}
          </dl>
          {main && points.length >= 3 && (
            <div className="mt-5 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-white/10">
              <TrendChart points={points} metric={main} />
            </div>
          )}
          {forecast && (
            <p className="mt-4 text-sm text-slate-700">
              <span className="font-semibold text-ink">Next day:</span> about {fmt(forecast.points[0].value)} {forecast.metric}. This is a rough estimate, not a promise. Speculara tested it by predicting each of the last three days from the days before, then comparing with what really happened, so you can see how far off it tends to be.
            </p>
          )}
        </>
      ) : (
        <div className="mt-4 space-y-3" aria-hidden={state === "loading"}>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-24 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 ${state === "loading" ? "skeleton-pulse" : ""}`} />
            ))}
          </div>
          <div className={`h-44 rounded-2xl bg-white/[0.04] ring-1 ring-white/10 ${state === "loading" ? "skeleton-pulse" : ""}`} />
          {state !== "loading" && <p className="text-sm text-slate-600">Load the demo or add your file to see your numbers measured here.</p>}
        </div>
      )}
    </section>
  );
}
