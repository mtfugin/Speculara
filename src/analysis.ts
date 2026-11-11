type State = { available: true; reason: null } | { available: false; reason: string };

export type Ratio = State & {
  numerator_metric: string;
  denominator_metric: string;
  numerator: number | null;
  denominator: number | null;
  percent: number | null;
  n: number;
  excluded_rows: number;
  zero_view_rows: number;
  notes: string[];
};

export type Period = State & {
  current_start: string | null;
  current_end: string | null;
  previous_start: string | null;
  previous_end: string | null;
  current_total: number | null;
  previous_total: number | null;
  absolute_change: number | null;
  percent_change: number | null;
  percent_change_reason: string | null;
};

export type Ranking = State & {
  rows: { label: string; numerator: number; views: number; percent: number; n: number }[];
  excluded_groups: number;
};

export const LIMITS =
  "Ratios use paired sums, include known zero-view rows and are proxies, not attributed conversion; ratios above 100% may reflect inconsistent measurement scopes. Category rankings require 3 complete positive-view rows and 1,000 views; posts require unique nonblank IDs and 100 views. Top 10 rates, then label order; exposure thresholds are heuristics, not significance guarantees. Periods require all 14 UTC dates and complete values; invalid dates block comparison; missing dates are not zero; missing values outside the windows do not block them. A zero previous total leaves percentage change undefined, including zero-to-zero. Pearson and Spearman need 3 nonconstant complete pairs; n<10 is exploratory, p-values unadjusted and assume independence. Forecasts need 14-365 consecutive dates; linear and last_value share the final 3-date holdout, lowest unrounded MAE wins, ties favor last_value; selected model refits all dates for seven projected dates. Target priority is sales, views, saves, likes, comments. One small holdout comparison, not validated generalization performance. No seasonality, uncertainty, percentage accuracy, causal effects or promised uplift. Category tests need two eligible categories and a strict winner. Post tests need four eligible unique posts and 1,000 views, at or above the linearly interpolated 75th percentile of views with sales/view below the paired overall rate; highest views then ID wins. Text remains a limited English/Filipino lexicon; negation neutral, sarcasm/context unsupported.";

export const calculationLabel = (key: string) =>
  key.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase());
const count = (value: number | null) =>
  value == null ? "unknown" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
export function ratioText(key: string, r: Ratio) {
  return `${calculationLabel(key)}: ${r.available ? `${count(r.numerator)} ${r.numerator_metric} / ${count(r.denominator)} views = ${r.percent!.toFixed(2)}%` : r.reason}. ${r.n} complete rows; ${r.excluded_rows} excluded rows; ${r.zero_view_rows} zero-view rows. ${r.notes.join(" ")}`;
}

export function periodText(key: string, p: Period) {
  return `${key}: previous ${p.previous_start ?? "unknown"} to ${p.previous_end ?? "unknown"}; current ${p.current_start ?? "unknown"} to ${p.current_end ?? "unknown"}. ${p.available ? `Previous ${p.previous_total}, current ${p.current_total} ${key}; absolute change ${p.absolute_change} ${key}; percentage change ${p.percent_change == null ? p.percent_change_reason : `${p.percent_change}%`}` : p.reason}`;
}

export function rankingText(group: string, key: string, r: Ranking) {
  return `${group} ${calculationLabel(key)}: ${r.available ? r.rows.map((x) => `${x.label}: ${count(x.numerator)} / ${count(x.views)} views = ${x.percent.toFixed(2)}%, ${x.n} complete rows`).join("; ") : r.reason}. ${r.excluded_groups} excluded groups.`;
}

export type Metric = "views" | "likes" | "saves" | "comments" | "sales";

export type Recommendation = {
  title: string;
  evidence: string;
  action: string;
  details?: string;
  success_metric?: string;
  post_id?: string;
  post_url?: string;
};
export type DecisionBrief = { changed: string; matters: string; try_next: string; measure: string };
export type FunnelStage = {
  key: "views" | "saves" | "questions" | "sales";
  label: string;
  value: number | null;
  note: string;
};
export const FUNNEL_NOTE =
  "These are independent counts, not a tracked customer journey. They do not show conversion or drop-off.";
export function safePostUrl(value?: string | null): string | null {
  if (!value || !/^https?:\/\/[^/]/i.test(value) || /[\s\\\x00-\x1f]/.test(value)) return null;
  if (/^https?:\/\/[^/?#]*@/i.test(value)) return null;
  try {
    const url = new URL(value);
    return /^(https?:)$/.test(url.protocol) && url.hostname && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function decisionBrief(a: Analysis): DecisionBrief {
  if (a.decision_brief) return a.decision_brief;
  const metric = (["sales", "views", "saves", "likes", "comments"] as const).find(
    (m) => a.periods?.[m]?.available,
  );
  return {
    changed: metric
      ? periodSummary(metric, a.periods[metric]!)
      : `${
          Object.entries(a.totals)
            .map(([k, v]) => `${count(v)} ${k}`)
            .join(", ") || "No numeric totals supplied"
        }. Weekly change needs dated complete data.`,
    matters: "Observed counts help choose what to review; they do not explain causes.",
    try_next: a.recommend[0]?.action ?? "Add complete dated counts before choosing a test.",
    measure:
      a.recommend[0]?.success_metric ??
      "Compare the chosen count before and after one change, with comparable exposure and time windows. No uplift is promised.",
  };
}
export function funnelStages(a: Analysis): FunnelStage[] {
  return (
    a.funnel?.stages ??
    (["views", "saves", "questions", "sales"] as const).map((key) => ({
      key,
      label: calculationLabel(key),
      value: key === "questions" ? (a.demand.inquiries ?? null) : (a.totals[key] ?? null),
      note:
        key === "questions"
          ? "Text rows with question signals, not numeric comments or unique people."
          : "Observed count; missing values are excluded.",
    }))
  );
}
function briefText(a: Analysis) {
  const b = decisionBrief(a);
  return `What changed: ${b.changed}\nWhy it matters: ${b.matters}\nTry next: ${b.try_next}\nHow to measure: ${b.measure}`;
}
const lowerFirst = (t: string) => (t ? t[0].toLowerCase() + t.slice(1) : t);
const endSentence = (t: string) => (/[.!?]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
/** Chat version of the brief: plain sentences, no labels. The report keeps its labelled layout. */
function briefChat(a: Analysis) {
  const b = decisionBrief(a);
  return [
    "Here is the short version.",
    endSentence(b.changed),
    endSentence(b.matters),
    `A good next step is to ${lowerFirst(endSentence(b.try_next))}`,
    `To see if it worked, ${lowerFirst(endSentence(b.measure))}`,
  ].join(" ");
}
/** Make any chat reply read like a person wrote it: no markdown marks, no "Label:" openers. */
export function plainChat(text: string): string {
  return text
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*(?:what changed|why it matters|changed|matters|try next|try this next|next step|measure|how to measure|summary|answer|note)\s*:\s*/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function funnelText(a: Analysis) {
  return `${funnelStages(a)
    .map((s) => `${s.label}: ${s.value == null ? "Not supplied" : count(s.value)}. ${s.note}`)
    .join("\n")}\n${FUNNEL_NOTE}${a.funnel?.note ? ` ${a.funnel.note}` : ""}`;
}
/** Chat wording for a suggested test: plain sentences instead of Evidence/Test/Measure labels. */
function experimentChat(r: Recommendation) {
  const url = safePostUrl(r.post_url);
  return `${endSentence(r.title)} ${endSentence(r.evidence)} To try it, ${lowerFirst(endSentence(r.action))} To check how it went, ${lowerFirst(endSentence(experimentMetric(r)))}${r.post_id ? ` This is about post ${r.post_id}.` : ""}${url ? ` You can open the post here ${url}` : ""}`;
}
/** Chat wording for the separate counts. */
function funnelChat(a: Analysis) {
  const parts = funnelStages(a)
    .filter((s) => s.value != null)
    .map((s) => (s.key === "questions" ? `${count(s.value!)} entries with a question` : `${count(s.value!)} ${s.label.toLowerCase()}`));
  return `${parts.length ? `You had ${parts.join(", ")}.` : "No counts were supplied."} ${FUNNEL_NOTE}`;
}
function experimentText(r: Recommendation) {
  const url = safePostUrl(r.post_url);
  return `${r.title}. Evidence: ${r.evidence} Test: ${r.action} How to measure: ${experimentMetric(r)}${r.post_id ? ` Post ID: ${r.post_id}.` : ""}${url ? ` Post: ${url}` : ""}`;
}
export function experimentMetric(r: Recommendation) {
  return (
    r.success_metric ??
    "Compare the relevant count across comparable exposure and time windows. Change one thing at a time; no uplift is promised."
  );
}

export type Analysis = {
  decision_brief?: DecisionBrief;
  funnel?: { stages: FunnelStage[]; note: string };
  preview?: {
    columns: string[];
    rows: Record<string, string | number | null>[];
    total_rows: number;
  };
  post_references?: { post_id: string | null; post_url: string | null }[];
  schema_version: 2;

  ratios: Record<string, Ratio>;

  periods: Partial<Record<Metric, Period>>;

  rankings: Record<"categories" | "posts", Record<string, Ranking>>;

  source_kind: "synthetic" | "uploaded";

  rows: number;

  columns: string[];

  metrics: Metric[];

  totals: Partial<Record<Metric, number>>;

  missing: Record<string, number>;

  warnings: string[];

  charts: Record<string, ({ label: string } & Partial<Record<Metric, number | null>>)[]>;

  correlation: {
    a: string;
    b: string;
    r: number;
    p: number;
    n: number;
    spearman_r: number;
    spearman_p: number;
    small_sample: boolean;
  }[];

  predict:
    | { available: false; reason: string }
    | {
        available: true;
        reason: null;
        notes: string[];
        metric: Metric;
        selected_model: "linear" | "last_value";
        evaluation: {
          holdout_dates: string[];
          train_days: number;
          scores: { linear: number; last_value: number };
        };
        method: string;
        mae: number;
        training_days: number;
        points: { label: string; value: number }[];
      };

  sentiment: State & {
    notes?: string[];

    method?: string;

    n?: number;

    counts?: Record<string, number>;

    keywords?: { word: string; count: number }[];
  };

  demand: State & {
    notes?: string[];

    inquiries?: number;

    requests?: number;

    text_rows?: number;

    sales?: number | null;

    saves?: number | null;
  };

  recommend: Recommendation[];
};

export function technicalAnswer(question: string, a: Analysis): string {
  const q = question.toLowerCase();

  if (/growth|period|week|change|increase|decrease/.test(q))
    return (
      Object.entries(a.periods ?? {})
        .map(([k, p]) => periodText(k, p!))
        .join("\n") ||
      "Period comparisons unavailable: need dated numeric metrics and all 14 calendar dates."
    );

  if (/ratio|\brate\b|conversion|per.view/.test(q))
    return (
      Object.entries(a.ratios ?? {})
        .map(([k, r]) => ratioText(k, r))
        .join("\n") || "Ratios unavailable: need paired metrics and views."
    );

  if (/rank|best.post|best.category|top.post|top.category/.test(q))
    return (
      (Object.entries(a.rankings ?? {})
        .flatMap(([g, rs]) => Object.entries(rs).map(([k, r]) => rankingText(g, k, r)))
        .join("\n") || "Rankings unavailable: need named groups and sufficient exposure.") +
      "\nCategory rankings require at least 3 complete positive-view rows and 1,000 views; posts require unique nonblank IDs and 100 views. Top 10 results; exposure thresholds are heuristics, not significance guarantees. Rankings are not causal."
    );

  if (/forecast|predict|accuracy|trend|last|long|mae|model/.test(q)) {
    const f = a.predict;

    return f.available
      ? `Next-day ${f.metric} projection: ${f.points[0].value.toLocaleString()}. Selected model: ${f.selected_model}; linear MAE: ${f.evaluation.scores.linear}; last_value MAE: ${f.evaluation.scores.last_value}; holdout dates: ${f.evaluation.holdout_dates.join(", ")}. ${f.notes.join(" ")} Held-out three-day MAE: ${f.mae} ${f.metric}. ${f.method} No percentage accuracy or trend lifespan is estimated.`
      : f.reason;
  }

  if (/correl|relat|link|pearson|spearman/.test(q)) {
    const p = a.correlation[0];

    return p
      ? `Strongest absolute association: ${p.a} and ${p.b}, Pearson r=${p.r}, p=${p.p}; Spearman rho=${p.spearman_r}, p=${p.spearman_p}; n=${p.n}${p.small_sample ? " (exploratory small sample)" : ""}. P-values are unadjusted. Association does not prove causation. Repeated observations may violate independence.`
      : "No nonconstant metric pair has at least three complete rows.";
  }

  if (/sentiment|keyword|feel|comment|word|review|feedback/.test(q)) {
    const s = a.sentiment;

    return s.available
      ? `${Object.entries(s.counts!)

          .map(([k, v]) => `${k}: ${v}`)

          .join(", ")} across ${s.n} text rows. Top words: ${s

          .keywords!.slice(0, 5)

          .map((x) => `${x.word} (${x.count})`)

          .join(", ")}. ${s.method}`
      : s.reason!;
  }

  if (/recommend|action|next|strategy|should/.test(q))
    return a.recommend.map((r) => `${r.title}. ${r.evidence} ${r.action}`).join("\n\n");

  if (/demand|inquir|request/.test(q)) {
    const d = a.demand;

    return d.available
      ? `Observed sales: ${d.sales ?? "not supplied"}; saves: ${d.saves ?? "not supplied"}; question rows: ${d.inquiries ?? "not supplied"}; request rows: ${d.requests ?? "not supplied"}. Signals may overlap and do not measure unique buyers.`
      : d.reason!;
  }

  if (/total|view|save|sale|like|chart|summary/.test(q))
    return `${a.rows.toLocaleString()} rows. Totals: ${
      Object.entries(a.totals)

        .map(([k, v]) => `${k}: ${v.toLocaleString()}`)

        .join(", ") || "no numeric metrics supplied"
    }. Missing counts are excluded.`;

  return "Ask about dataset totals, forecasts, correlation, sentiment, demand, or next actions. I cannot fetch accounts, infer causes, or answer unmeasured questions. All answers use this dataset only.";
}

export function relationshipSummary(p: Analysis["correlation"][number]) {
  const magnitude = Math.abs(p.r);
  const strength =
    magnitude < 0.3
      ? "No clear pattern"
      : magnitude < 0.7
        ? "Some connection"
        : "Strong connection";
  const direction =
    magnitude < 0.3
      ? "No clear pattern"
      : p.r < 0
        ? "Move in opposite directions"
        : "Move together";
  const finding =
    magnitude < 0.3
      ? `${p.a} and ${p.b} show no clear pattern.`
      : `When ${p.a} were higher, ${p.b} tended to be ${p.r < 0 ? "lower" : "higher"}.`;
  return {
    direction,
    strength,
    finding,
    note:
      p.n < 10
        ? "Early finding: more data could change this."
        : "This does not show that one causes the other.",
  };
}

export function friendlyUnavailable(kind: string, reason?: string): string {
  if (/repeated|duplicate/i.test(reason ?? ""))
    return "Repeated names cannot tell records apart. Give each post its own name, then compare again.";
  if (/forecast|predict/i.test(kind))
    return "Add at least 14 days of complete daily counts to estimate what comes next.";
  if (/period|growth|week/i.test(kind))
    return "Add complete counts for two full weeks to compare them.";
  if (/sentiment|text/i.test(kind)) return "Add comments or reviews to see how people feel.";
  if (/correl|relationship/i.test(kind))
    return "Add more entries with two changing counts to look for a connection.";
  if (/rank/i.test(kind)) return "Add named posts or categories with enough views to compare them.";
  return "Add views, sales, saves, or comments to find a useful next step.";
}

export function periodSummary(metric: string, p: Period): string {
  if (!p.available) return friendlyUnavailable("period", p.reason);
  const delta = p.absolute_change ?? 0;
  const movement =
    delta === 0
      ? "the same as the previous week"
      : `${delta > 0 ? "up" : "down"} ${count(Math.abs(delta))} from the previous week`;
  return (
    `In the latest week of your data there were ${count(p.current_total)} ${metric}, ${movement}.` +
    (p.previous_total === 0 ? ` There is no percentage change because the previous week had no ${metric}.` : "")
  );
}

export function demandSummary(a: Analysis): string {
  for (const metric of ["sales", "saves"] as const) {
    const period = a.periods?.[metric];
    if (period?.available) return periodSummary(metric, period);
    const total = a.totals[metric] ?? a.demand[metric];
    if (total != null) return `The dataset records ${count(total)} ${metric}.`;
  }
  if (a.demand.inquiries != null)
    return `${count(a.demand.inquiries)} ${a.demand.inquiries === 1 ? "entry contains a question" : "entries contain questions"}. Review them and answer recurring buying questions.`;
  return friendlyUnavailable("demand", a.demand.reason ?? undefined);
}

export function answer(question: string, a: Analysis): string {
  const q = question.toLowerCase();
  if (
    /technical|pearson|spearman|p.value|mae|model|method|calculation|threshold|forecast error/.test(
      q,
    )
  )
    return technicalAnswer(question, a);
  if (/decision brief|\bbrief\b|what it means|why.*matter/.test(q)) return briefChat(a);
  if (/funnel|independent count|customer journey|drop.off/.test(q)) return funnelChat(a);
  if (/measur|success metric|experiment/.test(q))
    return /more|all|another|three|\b3\b/.test(q)
      ? a.recommend.slice(0, 3).map(experimentChat).join("\n\n") || decisionBrief(a).measure
      : decisionBrief(a).measure;
  if (/negative|correl|relat|link/.test(q) && !/comment|review|sentiment|feedback/.test(q)) {
    const negative = a.correlation.find((p) => p.r < 0);
    const pair = /negative/.test(q) ? (negative ?? a.correlation[0]) : a.correlation[0];
    const concept = /negative/.test(q)
      ? "Negative means two counts tend to move in opposite directions; it is not automatically bad. "
      : "";
    return (
      concept +
      (pair
        ? `${relationshipSummary(pair).finding} ${relationshipSummary(pair).note} Compare the entries before choosing a change.`
        : friendlyUnavailable("relationship"))
    );
  }
  if (/recommend|strategy|next (action|step|decision)|what (should|can) i (do|try|change)/.test(q))
    return (
      a.recommend
        .slice(0, /more|all|another|three|3/.test(q) ? 3 : 1)
        .map(experimentChat)
        .join("\n\n") || friendlyUnavailable("recommendation")
    );
  if (/growth|period|week|change|increase|decrease/.test(q)) {
    const metric =
      a.metrics.find((m) => q.includes(m)) ?? (a.periods.sales ? "sales" : a.metrics[0]);
    const p = a.periods[metric];
    return p ? periodSummary(metric, p) : friendlyUnavailable("period");
  }
  if (/rank|best.post|best.category|top.post|top.category/.test(q)) {
    const group = /category/.test(q) ? a.rankings.categories : a.rankings.posts;
    const requested = (["sales", "saves", "likes", "comments"] as const).find((m) => q.includes(m));
    const metric = requested ?? "sales";
    const ranking =
      group[`${metric}_per_view`] ?? (requested ? undefined : Object.values(group)[0]);
    const top = ranking?.rows[0];
    return top
      ? `${top.label} leads this comparison: ${count(top.numerator)} ${metric} alongside ${count(top.views)} views. Test similar content with a comparable audience.`
      : friendlyUnavailable("ranking", ranking?.reason ?? undefined);
  }
  if (/ratio|\brate\b|conversion|per.view/.test(q)) {
    const requested = (["sales", "saves", "likes", "comments"] as const).find((m) => q.includes(m));
    const metric = requested ?? "sales";
    const r =
      a.ratios[`${metric}_per_view`] ??
      (requested ? undefined : Object.values(a.ratios).find((r) => r.available));
    return r?.available
      ? `${count(r.numerator)} ${r.numerator_metric} were recorded alongside ${count(r.denominator)} views (${count(r.percent)}%). Review the offer and test one change.`
      : friendlyUnavailable("ratio");
  }
  if (/forecast|predict|accuracy|trend|last|long/.test(q))
    return a.predict.available
      ? `Tomorrow you can expect about ${count(a.predict.points[0].value)} ${a.predict.metric}. Compare it with the real count tomorrow. This is a rough estimate, not a promise.`
      : friendlyUnavailable("forecast", a.predict.reason);
  if (/sentiment|keyword|feel|comment|word|review|feedback/.test(q)) {
    const s = a.sentiment;
    if (/keyword|top.words/.test(q)) {
      const top = s.keywords?.[0];
      return top
        ? `The most common word is "${top.word}" (${count(top.count)} mentions). Read the comments to check its context.`
        : friendlyUnavailable("sentiment");
    }
    const requestedLabel = ["negative", "positive", "neutral"].find((label) => q.includes(label));
    const top =
      requestedLabel && s.counts?.[requestedLabel] != null
        ? ([requestedLabel, s.counts[requestedLabel]] as const)
        : Object.entries(s.counts ?? {}).sort((a, b) => b[1] - a[1])[0];
    return s.available && top
      ? `${requestedLabel ? "The requested text label is" : "The most common text label is"} ${top[0]} (${count(top[1])} entries). Read a few comments to check context.`
      : friendlyUnavailable("sentiment", s.reason ?? undefined);
  }
  if (/demand|inquir|request/.test(q)) return demandSummary(a);
  if (/total|view|save|sale|like|chart|summary/.test(q)) {
    const metric =
      a.metrics.find((m) => q.includes(m)) ?? (a.totals.sales != null ? "sales" : a.metrics[0]);
    return metric && a.totals[metric] != null
      ? `The dataset records ${count(a.totals[metric]!)} ${metric} across ${count(a.rows)} entries. ${a.recommend[0]?.action ?? "Add dated counts to compare weeks."}`
      : demandSummary(a);
  }
  if (!/recommend|action|next|strategy|should|more|another/.test(q))
    return "Ask about this dataset totals, forecasts, relationships, comments, demand, or next actions. I cannot fetch accounts or infer causes.";
  return (
    a.recommend
      .slice(0, /more|all|another|three|3/.test(q) ? 3 : 1)
      .map(experimentText)
      .join("\n\n") || friendlyUnavailable("recommendation")
  );
}

export function download(name: string, content: string, type = "text/markdown;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));

  const link = document.createElement("a");

  link.href = url;

  link.download = name;

  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function analysisReport(a: Analysis, source: string) {
  return `# Speculara analysis report\n\nSource: ${source}\nGenerated: ${new Date().toISOString()}\n\n## Decision brief\n\n${briefText(a)}\n\n## Independent counts\n\n${funnelText(a)}\n\n## Experiments\n\n${a.recommend.map(experimentText).join("\n\n")}\n\n## Ratios\n\n${technicalAnswer("ratio", a)}\n\n## Period comparisons\n\n${technicalAnswer("growth", a)}\n\n## Rankings\n\n${technicalAnswer("rank", a)}\n\n## Forecast\n\n${technicalAnswer("forecast", a)}\n\n## Correlation\n\n${technicalAnswer("correlation", a)}\n\n## Sentiment\n\n${technicalAnswer("sentiment", a)}\n\n## Demand\n\n${technicalAnswer("demand", a)}\n\n## Data quality and limitations\n\n${LIMITS}\n\n${a.warnings.map((w) => `- ${w}`).join("\n")}\n\n## Full computed results\n\n\`\`\`json\n${JSON.stringify(a, null, 2)}\n\`\`\`\n`;
}

/* ---------- Views imported from chrisaph/speculara (profile analysis panels) ---------- */
export type TextSample = {
  id: string; text: string; tone: 'pos' | 'neg' | 'neu'; score?: number; kind?: string;
  author?: string; post_id: string; post_type: string; post_caption?: string; posted_at?: string;
  source_url?: string; post_url?: string; source_kind?: string;
}

export function sourceHref(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined
  try { const u = new URL(value); return ['http:', 'https:'].includes(u.protocol) && !u.username ? u.href : undefined } catch { return undefined }
}

export function sentimentView(analysis: any, options: { query?: string; range?: string; postType?: string; tone?: string; now?: number } = {}) {
  const all: TextSample[] = Array.isArray(analysis?.sentiment?.samples) ? analysis.sentiment.samples : []
  const query = options.query?.trim().toLowerCase() || ''
  const days = options.range === 'Last 30 days' ? 30 : options.range === 'Last 3 months' ? 90 : null
  const samples = all.filter((s) => (!query || `${s.text} ${s.post_caption || ''}`.toLowerCase().includes(query))
    && (!days || Date.parse(s.posted_at || '') >= (options.now ?? Date.now()) - days * 86400000)
    && (!options.postType || options.postType === 'All types' || s.post_type === options.postType)
    && (!options.tone || options.tone === 'All' || s.tone === options.tone))
  const positive = samples.filter((s) => s.tone === 'pos').length
  const negative = samples.filter((s) => s.tone === 'neg').length
  const pos = samples.length ? Math.round(100 * positive / samples.length) : 0
  const neg = samples.length ? Math.round(100 * negative / samples.length) : 0
  const keywords = (analysis?.sentiment?.keywords || []).flatMap((k: any) => {
    const matching = samples.filter((s) => k.sample_ids?.includes(s.id) || (!k.sample_ids && s.text.toLowerCase().includes(k.w.toLowerCase())))
    return matching.length ? [{ ...k, n: matching.length }] : []
  })
  return { samples, keywords, pos, neg, neu: samples.length ? 100 - pos - neg : 0,
    types: ['All types', ...new Set(all.map((s) => s.post_type))], basis: analysis?.sentiment?.basis || 'none' }
}

export function demandPeriods(weekly: any[] = [], period = 'Weekly') {
  const grouped = new Map<string, number>()
  for (const row of weekly) {
    const label = period === 'Monthly' ? row.date.slice(0, 7) : row.date
    grouped.set(label, (grouped.get(label) || 0) + Number(row.questions || 0) + Number(row.requests || 0))
  }
  return [...grouped].map(([label, value]) => ({ label, value }))
}
