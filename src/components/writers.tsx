import { useEffect, useState } from "react";

import { download } from "../analysis";
import { Card, H } from "../design-system/ui";

/* The weekly brief and the comment reader. Numbers come from the analysis code; the AI step is optional and checked. */
const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

async function postApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.detail === "string" ? data.detail : "That did not work. Try again.");
  return data as T;
}

function useAiAvailable() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/health`)
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => alive && setOn(h?.ai === true))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return on;
}

function AiToggle({ checked, onChange, what }: { checked: boolean; onChange: (v: boolean) => void; what: string }) {
  return (
    <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4" />
      <span>Use AI to write this. It sends {what} to the AI service. Leave it off to keep everything on your computer.</span>
    </label>
  );
}

type BriefOut = {
  mode: "ai" | "rules";
  headline: string;
  changed: { text: string }[];
  actions: { text: string }[];
  dropped: number;
};

export function WeeklyBrief({ analysis }: { analysis: unknown }) {
  const ai = useAiAvailable();
  const [useAi, setUseAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [brief, setBrief] = useState<BriefOut | null>(null);
  const [copied, setCopied] = useState(false);
  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      setBrief(await postApi<BriefOut>("/api/brief", { analysis, use_ai: useAi && ai }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };
  const asText = brief
    ? [
        "Weekly brief",
        brief.headline,
        "",
        "What changed",
        ...brief.changed.map((c) => `- ${c.text}`),
        "",
        "What to do next",
        ...brief.actions.map((c) => `- ${c.text}`),
      ].join("\n")
    : "";
  return (
    <Card label="Weekly brief">
      <H sub="A one page summary you can send to your team.">Weekly brief</H>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy} onClick={run} className="btn-primary min-h-11 rounded-xl px-4 font-semibold">
          {busy ? "Writing…" : brief ? "Write it again" : "Write my weekly brief"}
        </button>
        {brief && (
          <>
            <button
              type="button"
              className="ctl min-h-11 rounded-xl px-4 font-semibold text-ink"
              onClick={() => {
                navigator.clipboard?.writeText(asText).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                });
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              className="ctl min-h-11 rounded-xl px-4 font-semibold text-ink"
              onClick={() => download("weekly-brief.txt", asText, "text/plain")}
            >
              Download
            </button>
          </>
        )}
      </div>
      {ai && <AiToggle checked={useAi} onChange={setUseAi} what="your summary numbers (not your rows or comments)" />}
      {err && (
        <p role="alert" className="mt-3 text-sm text-wine">
          {err}
        </p>
      )}
      {brief && (
        <div className="mt-5 space-y-5" data-private>
          <p className="font-sans text-xl font-medium leading-snug text-ink">{brief.headline}</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">What changed</p>
            <ul className="mt-2 grid gap-2 text-sm text-slate-700">
              {brief.changed.map((c, i) => (
                <li key={i}>{c.text}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">What to do next</p>
            <ul className="mt-2 grid gap-2 text-sm text-slate-700">
              {brief.actions.map((c, i) => (
                <li key={i}>{c.text}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-slate-600">
            {brief.mode === "ai"
              ? `Written by AI. Every number was checked against your results${brief.dropped ? `, and ${brief.dropped} sentence${brief.dropped === 1 ? "" : "s"} that did not match ${brief.dropped === 1 ? "was" : "were"} removed` : ""}.`
              : "Built from your results with fixed rules. No AI was used."}
          </p>
        </div>
      )}
    </Card>
  );
}

type ReaderOut = {
  mode: "ai" | "rules";
  n: number;
  tones: Record<string, number>;
  intents: Record<string, number>;
  themes: { theme: string; count: number; example: string }[];
  triage: { questions: string[]; requests: string[]; complaints: string[]; praise: string[] };
};

const INTENT_LABEL = { question: "Questions", request: "Requests", complaint: "Complaints", praise: "Praise" } as const;
const GROUPS = [
  ["Questions to answer", "questions"],
  ["Requests", "requests"],
  ["Complaints to look at", "complaints"],
  ["Praise you can reuse", "praise"],
] as const;

export function CommentReader({ texts }: { texts: string[] }) {
  const ai = useAiAvailable();
  const [useAi, setUseAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [out, setOut] = useState<ReaderOut | null>(null);
  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      setOut(await postApi<ReaderOut>("/api/comments/read", { texts, use_ai: useAi && ai }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-6 border-t border-border-default pt-5">
      <p className="text-sm font-semibold text-ink">Sort the comments by what they need</p>
      <p className="mt-1 text-sm text-slate-700">
        Finds buying questions, requests, complaints and praise, and the topics people keep raising.
      </p>
      <button type="button" disabled={busy} onClick={run} className="btn-primary mt-3 min-h-11 rounded-xl px-4 font-semibold">
        {busy ? "Reading…" : out ? "Read again" : `Read ${texts.length} comments`}
      </button>
      {ai && <AiToggle checked={useAi} onChange={setUseAi} what="the comment text" />}
      {err && (
        <p role="alert" className="mt-3 text-sm text-wine">
          {err}
        </p>
      )}
      {out && (
        <div className="mt-5 space-y-5" data-private>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(INTENT_LABEL) as (keyof typeof INTENT_LABEL)[]).map((k) => (
              <div key={k} className="well rounded-xl px-3 py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{INTENT_LABEL[k]}</dt>
                <dd className="font-sans text-2xl font-semibold tabular-nums text-ink">{out.intents[k] ?? 0}</dd>
              </div>
            ))}
          </dl>
          {out.themes.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-ink">{out.mode === "ai" ? "Topics people raise" : "Words people repeat"}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {out.themes.map((t) => (
                  <li key={t.theme} title={t.example} className="chip px-3 py-1 text-sm">
                    {t.theme} <span className="tabular-nums text-slate-600">{t.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {GROUPS.map(([label, key]) =>
              out.triage[key].length ? (
                <div key={key}>
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <ul className="mt-2 grid gap-2">
                    {out.triage[key].map((t, i) => (
                      <li key={i} className="well rounded-xl px-3 py-2 text-sm text-slate-700">
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null,
            )}
          </div>
          <p className="text-xs text-slate-600">
            {out.mode === "ai"
              ? "Labeled by AI. Check the comments yourself before replying."
              : "Sorted with fixed word rules on your computer. No AI was used."}
          </p>
        </div>
      )}
    </div>
  );
}
