/* Screens that show where collected data came from and what is in it:
   the profile header (picture, name, source line, downloads), metric tiles, post thumbnails and the preview rows.
   Everything here reads the analysis as it arrives; nothing is stored. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "../design-system/Icon";
import { RollingNumber, isRollable } from "../design-system/RollingNumber";
import type { Analysis } from "../analysis";

/* ---------- Text that fits: long values are cut with "…" and slide sideways on hover or focus ---------- */
export function FitText({ children, className = "", label }: { children: string; className?: string; label?: string }) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const measure = () => setShift(Math.max(0, Math.ceil(i.scrollWidth - o.clientWidth)));
    measure();
    if (!("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    return () => ro.disconnect();
  }, [children]);
  const clipped = shift > 0;
  return (
    <span
      ref={outer}
      className={`fit ${className}`}
      data-clipped={clipped || undefined}
      tabIndex={clipped ? 0 : undefined}
      title={clipped ? (label ?? children) : undefined}
      style={clipped ? ({ ["--shift" as string]: `-${shift}px`, ["--shift-ms" as string]: `${Math.max(1800, shift * 22)}ms` } as React.CSSProperties) : undefined}
    >
      <span ref={inner} className="fit__in">
        {isRollable(children) ? <RollingNumber value={children} /> : children}
      </span>
    </span>
  );
}

/* ---------- Emphasis: numbers, percentages and the phrases a person must not miss ---------- */
const KEY = /(\d[\d,]*(?:\.\d+)?%?|needs? more data|not supplied|insufficient|cannot|does not|do not|early finding|exploratory|small sample)/gi;

export function Emphasis({ text }: { text: string }) {
  const parts = text.split(KEY);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-bold text-ink underline decoration-orange/60 decoration-2 underline-offset-4">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/* ---------- Metric tile: icon, label, one fixed-size value row, one note row ---------- */
const METRIC_ICONS: Record<string, IconName> = { views: "views", saves: "saves", questions: "questions", sales: "sales", likes: "likes", comments: "comments" };

export function MetricTile({ id, label, value, note }: { id: string; label: string; value: number | null; note?: string }) {
  const missing = value == null;
  const text = missing ? "Not Supplied" : value.toLocaleString();
  return (
    <div className="metric-tile">
      <dt className="flex items-center gap-2.5 text-sm font-semibold text-ink">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink/10 text-ink">
          <Icon name={METRIC_ICONS[id] ?? "info"} size="md" />
        </span>
        <span className="min-w-0">{label}</span>
      </dt>
      <dd className={`mt-3 h-12 font-sans text-4xl font-semibold leading-[3rem] tracking-tight tabular ${missing ? "text-slate-600" : "text-ink"}`}>
        <FitText>{text}</FitText>
      </dd>
      {note && <dd className="mt-1 line-clamp-2 min-h-[2.75rem] text-sm leading-[1.375rem] text-slate-600">{note}</dd>}
    </div>
  );
}

/* ---------- Downloads ---------- */
function csvCell(value: unknown) {
  if (value == null) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tableToCsv(table: NonNullable<Analysis["data_table"]>) {
  const lines = [table.columns.map(csvCell).join(",")];
  for (const row of table.rows) lines.push(table.columns.map((c) => csvCell(row[c])).join(","));
  return "﻿" + lines.join("\r\n");
}

function saveBlob(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const stamp = () => new Date().toISOString().slice(0, 10);

export function sourceLine(a: Analysis, label?: string) {
  const p = a.provenance;
  if (!p) return label ? `From the file ${label}` : "";
  const when = p.collected_at ? new Date(p.collected_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
  return [`Collected from ${p.source} @${p.handle}`, p.method, when].filter(Boolean).join(" · ");
}

export function DownloadButtons({ analysis, label, className = "" }: { analysis: Analysis; label: string; className?: string }) {
  const handle = analysis.profile?.handle ?? analysis.provenance?.handle ?? slug(label);
  const platform = slug(analysis.profile?.platform ?? analysis.provenance?.source ?? "data");
  const avatar = analysis.profile?.avatar;
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {analysis.data_table && (
        <button
          type="button"
          className="ctl inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink"
          onClick={() => saveBlob(`speculara-${platform}-${handle}-${stamp()}.csv`, tableToCsv(analysis.data_table!), "text/csv;charset=utf-8")}
        >
          <Icon name="download" size="sm" /> Download data (CSV)
        </button>
      )}
      {avatar && (
        <a
          className="ctl inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-ink"
          href={avatar}
          download={`${platform}-${handle}-profile.${avatar.startsWith("data:image/png") ? "png" : avatar.startsWith("data:image/webp") ? "webp" : "jpg"}`}
        >
          <Icon name="user" size="sm" /> Download profile picture
        </a>
      )}
    </div>
  );
}

/* ---------- Profile header: who this is, where it came from, how complete it is ---------- */
export function ProfileHeader({ analysis, label, children }: { analysis: Analysis; label: string; children?: ReactNode }) {
  const profile = analysis.profile;
  const p = analysis.provenance;
  const name = profile?.nickname || (p ? `@${p.handle}` : label);
  const followers = profile?.followers;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-4">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-ink/10 text-ink ring-1 ring-border-default" data-private>
        {profile?.avatar ? <img src={profile.avatar} alt={`${name} profile picture`} className="h-full w-full object-cover" /> : <Icon name="user" size="xl" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words font-display text-xl font-bold text-ink" data-private>
          {name}
        </p>
        <p className="mt-0.5 break-words text-sm text-slate-700" data-private>
          {p ? `@${p.handle} · ${p.source}` : label}
          {followers != null && (
            <>
              {" · "}
              <strong className="font-semibold text-ink">{followers.toLocaleString()}</strong> followers
            </>
          )}
        </p>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
          <Icon name="info" size="sm" className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{sourceLine(analysis, label)}</span>
        </p>
      </div>
      {children}
    </div>
  );
}

/* ---------- Stats strip: how much was read and how complete it is ---------- */
export function CollectionFacts({ analysis }: { analysis: Analysis }) {
  const p = analysis.provenance;
  if (!p) return null;
  const blank = Object.values(p.metrics).reduce((n, m) => n + m.blank, 0);
  const items: { icon: IconName; value: string; label: string }[] = [
    { icon: "posts", value: p.posts.toLocaleString(), label: "posts" },
    { icon: "comments", value: p.comments.kept.toLocaleString(), label: p.comments.read > p.comments.kept ? `comments kept of ${p.comments.read.toLocaleString()} read` : "comments" },
    { icon: blank ? "warning" : "success", value: blank ? blank.toLocaleString() : "0", label: blank ? "counts the page did not show" : "counts missing" },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3 rounded-2xl bg-ink/[0.06] p-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink/10 text-ink">
            <Icon name={item.icon} size="md" />
          </span>
          <span className="min-w-0 leading-tight">
            <strong className="block font-sans text-2xl font-semibold tabular text-ink">{item.value}</strong>
            <span className="block text-xs text-slate-600">{item.label}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- Preview rows: compact cards, no sideways scrolling ---------- */
export function PreviewRows({ analysis }: { analysis: Analysis }) {
  const table = analysis.data_table;
  const refs = new Map((analysis.post_references ?? []).map((r) => [r.post_id, r]));
  if (table) {
    const posts = table.rows.filter((r) => r.views != null || r.likes != null || r.comments != null).slice(0, 5);
    return (
      <ol className="space-y-2" aria-label="First posts">
        {posts.map((row, i) => {
          const thumb = refs.get(String(row.post_id))?.thumb_url;
          return (
            <li key={i} className="flex items-center gap-3 rounded-2xl bg-ink/[0.06] p-2.5">
              <Thumb src={thumb} className="h-16 w-12 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-700">
                  <span className="font-semibold text-ink">{String(row.date ?? "")}</span>
                  {row.category && <span className="chip px-2 py-0.5 text-xs">{String(row.category)}</span>}
                </p>
                <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {(["views", "likes", "comments"] as const).map((k) => (
                    <span key={k} className="inline-flex items-center gap-1.5 tabular text-slate-700">
                      <Icon name={k} size="sm" />
                      <strong className="font-semibold text-ink">{row[k] == null ? "n/a" : Number(row[k]).toLocaleString()}</strong>
                    </span>
                  ))}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }
  const preview = analysis.preview;
  if (!preview?.rows.length) return <p className="text-sm text-slate-700">Row preview is unavailable for this response.</p>;
  return (
    <ol className="space-y-2" aria-label="First rows">
      {preview.rows.slice(0, 5).map((row, i) => (
        <li key={i} className="rounded-2xl bg-ink/[0.06] p-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {preview.columns.map((c) => (
              <div key={c} className="min-w-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{c}</dt>
                <dd className="mt-0.5 line-clamp-2 break-words text-ink">{row[c] == null ? "n/a" : String(row[c])}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Thumbnails ---------- */
export function Thumb({ src, className = "" }: { src?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`grid place-items-center overflow-hidden rounded-xl bg-ink/10 text-slate-600 ${className}`} data-private>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <Icon name="posts" size="md" />
      )}
    </span>
  );
}

/* ---------- Post references with video thumbnails ---------- */
export function PostGallery({ analysis, safeUrl }: { analysis: Analysis; safeUrl: (u: string | null) => string | null }) {
  const [all, setAll] = useState(false);
  const stats = new Map((analysis.data_table?.rows ?? []).filter((r) => r.views != null || r.likes != null).map((r) => [String(r.post_id), r]));
  const refs = (analysis.post_references ?? []).filter((r) => safeUrl(r.post_url));
  if (!refs.length) return null;
  const shown = all ? refs : refs.slice(0, 12);
  return (
    <section className="mt-6" aria-label="Post references">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="font-display text-lg font-bold text-ink">Posts in this analysis</h4>
        <p className="text-sm text-slate-600">Links open the post in a new tab. They are references, not verified platform connections.</p>
      </div>
      <ul className="mt-3 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr))]">
        {shown.map((r, i) => {
          const s = stats.get(String(r.post_id));
          return (
            <li key={i} className="min-w-0">
              <a
                href={safeUrl(r.post_url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-2xl bg-ink/[0.06] p-2 transition-colors hover:bg-ink/10"
                aria-label={`${r.post_id ? `Post ${r.post_id}` : `Post link ${i + 1}`} (opens in new tab)`}
              >
                <Thumb src={r.thumb_url} className="aspect-[3/4] w-full" />
                <span className="mt-2 block truncate text-xs font-semibold text-ink">{r.post_id ? `Post ${r.post_id}` : `Post ${i + 1}`}</span>
                {s && (
                  <span className="mt-1 flex items-center gap-1 text-xs tabular text-slate-700">
                    <Icon name="views" size="sm" className="shrink-0" />
                    <FitText>{Number(s.views ?? 0).toLocaleString()}</FitText>
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
      {refs.length > 12 && (
        <button type="button" className="ctl mt-3 min-h-11 rounded-xl px-4 text-sm font-semibold text-ink" onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer posts" : `Show all ${refs.length} posts`}
        </button>
      )}
    </section>
  );
}
