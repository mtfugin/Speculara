import type { Analysis } from "./analysis.ts";
import { demandSummary, relationshipSummary } from "./analysis.ts";

export type ModuleKey = "predict" | "recommend" | "charts" | "correlation" | "sentiment" | "demand";
type ModuleInfo = {
  status: "Needs more data" | "Ready" | "Early finding";
  finding: string;
  why: string;
  needed?: string;
};
const format = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
const instructions: Record<ModuleKey, string> = {
  predict:
    "Add dates and daily sales or views. Use 14 to 365 consecutive days with no missing counts.",
  recommend: "Add views, saves, sales, or comments to find a useful next step.",
  charts: "Add counts such as views, saves, or sales to see your charts.",
  correlation: "Add at least 3 entries with two changing counts, such as views and sales.",
  sentiment: "Add a text column with individual comments or reviews.",
  demand: "Add sales, saves, or individual comments to see buying signals.",
};
const hints: Record<ModuleKey, string> = {
  predict: "A rough estimate can help you plan what to check next. It is not a promise.",
  recommend: "Testing one small change helps you learn what works for your audience.",
  charts: "Comparing counts helps you see where attention and purchases differ.",
  correlation: "Related movements suggest what to investigate, but do not tell you the cause.",
  sentiment: "Comment labels can point you toward feedback worth reading yourself.",
  demand:
    "Purchases and questions help you choose what to review. Interest is not a guaranteed sale.",
};
export function moduleInfo(key: ModuleKey, a: Analysis | null): ModuleInfo {
  if (!a)
    return {
      status: "Needs more data",
      finding: "Upload a file or try the clearly labeled synthetic demo.",
      why: hints[key],
      needed: instructions[key],
    };
  const missing: ModuleInfo = {
    status: "Needs more data",
    finding: instructions[key],
    why: hints[key],
    needed: instructions[key],
  };
  switch (key) {
    case "predict":
      return a.predict.available
        ? {
            status: "Early finding",
            finding: `${format(a.predict.points[0].value)} ${a.predict.metric} estimated for ${a.predict.points[0].label}.`,
            why: hints[key],
          }
        : missing;
    case "recommend":
      return a.recommend.some(
        (r) => !/^Add more useful data$/i.test(r.title) && !!r.evidence && !!r.action,
      )
        ? { status: "Ready", finding: `Your best first step is to ${a.recommend[0].title.charAt(0).toLowerCase()}${a.recommend[0].title.slice(1).replace(/\.$/, "")}.`, why: hints[key] }
        : missing;
    case "charts": {
      const metrics = (["views", "saves", "sales"] as const).filter((m) => a.totals[m] != null);
      const chosen = metrics.length ? metrics : a.metrics.slice(0, 3);
      return chosen.length
        ? {
            status: "Ready",
            finding: chosen.map((m) => `${format(a.totals[m]!)} ${m}`).join(", ") + ".",
            why: hints[key],
          }
        : missing;
    }
    case "correlation": {
      const p = a.correlation[0];
      return p
        ? {
            status: p.n < 10 ? "Early finding" : "Ready",
            finding: relationshipSummary(p).finding,
            why: hints[key],
          }
        : missing;
    }
    case "sentiment": {
      const s = a.sentiment;
      const top = Object.entries(s.counts ?? {}).sort((a, b) => b[1] - a[1])[0];
      return s.available && top
        ? {
            status: "Early finding",
            finding: `${format(top[1])} text entries were labeled ${top[0]} by the simple word check.`,
            why: hints[key],
          }
        : missing;
    }
    case "demand":
      return a.demand.available
        ? { status: "Ready", finding: demandSummary(a), why: hints[key] }
        : missing;
  }
}
export function updatedLabel(at: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - at) / 60000));
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  return "Updated " + new Date(at).toLocaleDateString();
}
export function priorityLabel(index: number): string {
  return index === 0 ? "Start here" : index === 1 ? "Try next" : "Also consider";
}
