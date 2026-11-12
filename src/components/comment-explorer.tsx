/* Comment explorer: every collected comment in one place. Search, filter by tone and post type, sort,
   hide the ones you do not want to see, and bring them back. Tone comes from the same simple word check as the
   rest of the Sentiment card, so it is a guide, not a verdict. */
import { useMemo, useState } from "react";
import { ChevronDown, Eye, EyeOff, MessageSquare, Search, X } from "lucide-react";
import type { Analysis } from "../analysis";

type Comment = NonNullable<Analysis["comments"]>[number];
type Tone = Comment["tone"];
type ToneFilter = "all" | Tone;
type SortKey = "original" | "positive" | "negative" | "newest" | "oldest" | "longest" | "shortest";

const PAGE = 25;
const TONE_LABEL: Record<Tone, string> = { pos: "Positive", neu: "Neutral", neg: "Negative" };
const TONE_COLOR: Record<Tone, string> = {
  pos: "var(--color-green)",
  neu: "var(--color-dim)",
  neg: "var(--color-action-destructive)",
};
const SORTS: [SortKey, string][] = [
  ["original", "Original order"],
  ["positive", "Most positive first"],
  ["negative", "Most negative first"],
  ["newest", "Newest post first"],
  ["oldest", "Oldest post first"],
  ["longest", "Longest first"],
  ["shortest", "Shortest first"],
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRe(q)})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="cx-mark">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

const dateLabel = (d?: string | null) => {
  if (!d) return "";
  const t = Date.parse(d);
  return Number.isNaN(t) ? d : new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

export function CommentExplorer({ comments }: { comments: Comment[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<ToneFilter>("all");
  const [type, setType] = useState("All types");
  const [sort, setSort] = useState<SortKey>("original");
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const types = useMemo(() => ["All types", ...new Set(comments.map((c) => c.post_type).filter((t): t is string => !!t))], [comments]);
  const counts = useMemo(() => {
    const c = { all: comments.length, pos: 0, neu: 0, neg: 0 };
    for (const x of comments) c[x.tone]++;
    return c;
  }, [comments]);

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = comments.filter(
      (c) => (tone === "all" || c.tone === tone) && (type === "All types" || c.post_type === type) && (!q || c.text.toLowerCase().includes(q)),
    );
    const when = (c: Comment) => Date.parse(c.posted_at || "");
    const by: Record<SortKey, ((a: Comment, b: Comment) => number) | null> = {
      original: null,
      positive: (a, b) => b.score - a.score,
      negative: (a, b) => a.score - b.score,
      newest: (a, b) => (Number.isNaN(when(b)) ? -Infinity : when(b)) - (Number.isNaN(when(a)) ? -Infinity : when(a)),
      oldest: (a, b) => (Number.isNaN(when(a)) ? Infinity : when(a)) - (Number.isNaN(when(b)) ? Infinity : when(b)),
      longest: (a, b) => b.text.length - a.text.length,
      shortest: (a, b) => a.text.length - b.text.length,
    };
    const cmp = by[sort];
    return cmp ? [...rows].sort(cmp) : rows;
  }, [comments, query, tone, type, sort]);

  const visible = matching.filter((c) => !hidden.has(c.id));
  const hiddenMatching = matching.length - visible.length;
  const shown = (showHidden ? matching : visible).slice(0, limit);
  const total = showHidden ? matching.length : visible.length;
  const filtered = query.trim() !== "" || tone !== "all" || type !== "All types";

  const hide = (id: string) => setHidden((h) => new Set(h).add(id));
  const restore = (id: string) =>
    setHidden((h) => {
      const n = new Set(h);
      n.delete(id);
      return n;
    });
  const reset = () => {
    setQuery("");
    setTone("all");
    setType("All types");
    setLimit(PAGE);
  };
  const resetLimit = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  return (
    <div className="mt-6 border-t border-border-default pt-5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="comment-explorer"
        onClick={() => setOpen((o) => !o)}
        className="cx-toggle flex min-h-11 w-full items-center gap-3 rounded-xl px-1 text-left"
      >
        <span className="cx-icon" aria-hidden="true">
          <MessageSquare size={16} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">All comments</span>
          <span className="block text-xs text-slate-600">
            Search, filter, sort and hide any of the {comments.length.toLocaleString()} comments
          </span>
        </span>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-slate-600 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id="comment-explorer" className="mt-4 space-y-4" data-private>
          {/* Search + sort */}
          <div className="flex flex-wrap gap-2">
            <label className="cx-search well flex min-h-11 min-w-0 flex-1 basis-56 items-center gap-2 rounded-xl px-3">
              <Search size={16} aria-hidden="true" className="shrink-0 text-slate-600" />
              <span className="sr-only">Search comments</span>
              <input
                value={query}
                onChange={(e) => resetLimit(setQuery)(e.target.value)}
                placeholder="Search comments"
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-slate-600"
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => resetLimit(setQuery)("")} className="shrink-0 text-slate-600 hover:text-ink">
                  <X size={16} aria-hidden="true" />
                </button>
              )}
            </label>
            <label className="sr-only" htmlFor="cx-sort">
              Sort comments
            </label>
            <select
              id="cx-sort"
              value={sort}
              onChange={(e) => resetLimit(setSort)(e.target.value as SortKey)}
              className="well min-h-11 rounded-xl bg-transparent px-3 text-sm text-ink"
            >
              {SORTS.map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            {types.length > 2 && (
              <>
                <label className="sr-only" htmlFor="cx-type">
                  Post type
                </label>
                <select
                  id="cx-type"
                  value={type}
                  onChange={(e) => resetLimit(setType)(e.target.value)}
                  className="well min-h-11 rounded-xl bg-transparent px-3 text-sm text-ink"
                >
                  {types.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* Tone filter */}
          <div role="group" aria-label="Filter by tone" className="flex flex-wrap gap-2">
            {(["all", "pos", "neu", "neg"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tone === t}
                onClick={() => resetLimit(setTone)(t)}
                className="ctl cx-pill inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold"
              >
                {t !== "all" && <span className="cx-dot" style={{ background: TONE_COLOR[t] }} aria-hidden="true" />}
                {t === "all" ? "All" : TONE_LABEL[t]}
                <span className="tabular-nums text-slate-600">{counts[t].toLocaleString()}</span>
              </button>
            ))}
          </div>

          {/* Status line + bulk actions */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-slate-700">
            <p role="status" aria-live="polite">
              {total === 0
                ? "No comments to show"
                : `Showing ${Math.min(shown.length, total).toLocaleString()} of ${total.toLocaleString()} comment${total === 1 ? "" : "s"}`}
              {filtered && " (filtered)"}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {filtered && (
                <button type="button" onClick={reset} className="cx-link">
                  Clear filters
                </button>
              )}
              {visible.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHidden((h) => new Set([...h, ...visible.map((c) => c.id)]))}
                  className="cx-link"
                >
                  Hide these {visible.length.toLocaleString()}
                </button>
              )}
              {hidden.size > 0 && (
                <>
                  <button type="button" aria-pressed={showHidden} onClick={() => setShowHidden((s) => !s)} className="cx-link">
                    {showHidden ? "Back to visible" : `Show ${hiddenMatching.toLocaleString()} hidden`}
                  </button>
                  <button type="button" onClick={() => setHidden(new Set())} className="cx-link">
                    Restore all
                  </button>
                </>
              )}
            </div>
          </div>

          {/* List */}
          {shown.length > 0 ? (
            <ul className="grid gap-2">
              {shown.map((c) => {
                const isHidden = hidden.has(c.id);
                return (
                  <li key={c.id} className={`cx-row well rounded-xl px-3 py-3 ${isHidden ? "is-hidden" : ""}`}>
                    <span className="cx-bar" style={{ background: TONE_COLOR[c.tone] }} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm leading-relaxed text-ink">
                        <Highlight text={c.text} query={query} />
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-600">
                        <span className="font-semibold" style={{ color: TONE_COLOR[c.tone] }}>
                          {TONE_LABEL[c.tone]}
                        </span>
                        {c.post_type && <span>· {c.post_type}</span>}
                        {c.posted_at && <span>· {dateLabel(c.posted_at)}</span>}
                        {isHidden && <span>· Hidden</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (isHidden ? restore(c.id) : hide(c.id))}
                      aria-label={isHidden ? "Show this comment again" : "Hide this comment"}
                      title={isHidden ? "Show again" : "Hide"}
                      className="cx-eye"
                    >
                      {isHidden ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="well rounded-xl px-4 py-8 text-center text-sm text-slate-700">
              <p className="font-semibold text-ink">{comments.length && visible.length === 0 && !filtered ? "Every comment is hidden" : "No comments match"}</p>
              <p className="mt-1 text-slate-600">
                {filtered ? "Try a different word or clear the filters." : "Use Restore all to bring them back."}
              </p>
            </div>
          )}

          {total > shown.length && (
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="ctl min-h-11 rounded-xl px-4 font-semibold text-ink">
                Show {Math.min(PAGE, total - shown.length)} more
              </button>
              <button type="button" onClick={() => setLimit(Infinity)} className="ctl min-h-11 rounded-xl px-4 font-semibold text-ink">
                Show all {total.toLocaleString()}
              </button>
            </div>
          )}
          <p className="text-xs text-slate-600">
            Tone comes from a simple word check, so it can miss sarcasm and context. Hiding a comment only removes it from this list; it does not change the
            numbers above.
          </p>
        </div>
      )}
    </div>
  );
}
