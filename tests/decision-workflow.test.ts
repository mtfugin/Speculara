import test from "node:test";
import assert from "node:assert/strict";
import {
  decisionBrief,
  funnelStages,
  safePostUrl,
  answer,
  analysisReport,
  technicalAnswer,
  type Analysis,
} from "../src/analysis.ts";
const a = {
  schema_version: 2,
  source_kind: "uploaded",
  rows: 3,
  columns: [],
  metrics: ["views", "sales"],
  totals: { views: 50, sales: 0 },
  missing: {},
  warnings: [],
  charts: {},
  ratios: {},
  periods: {},
  rankings: { categories: {}, posts: {} },
  correlation: [],
  predict: { available: false, reason: "Need dates" },
  sentiment: { available: false, reason: "Need text" },
  demand: { available: false, reason: "Need text" },
  recommend: [
    {
      title: "Review",
      evidence: "Zero sales",
      action: "Test one offer",
      success_metric: "Compare sales with comparable exposure",
    },
  ],
} satisfies Analysis;
test("legacy data keeps known zero and missing independent counts distinct", () => {
  assert.match(decisionBrief(a).changed, /0 sales/);
  assert.match(decisionBrief(a).changed, /weekly change/i);
  assert.deepEqual(
    funnelStages(a).map((s) => s.value),
    [50, null, null, 0],
  );
});
test("brief, funnel and measurement chat match report without fabricated conversion", () => {
  const extended = {
    ...a,
    decision_brief: {
      changed: "Observed totals",
      matters: "Review evidence",
      try_next: "Test offer",
      measure: "Compare exposure",
    },
  };
  assert.match(answer("decision brief", extended), /Observed totals/);
  assert.match(answer("funnel", a), /independent counts/i);
  assert.match(answer("How do I measure success?", a), /comparable exposure/);
  const report = analysisReport(extended, "test.csv");
  assert.ok(report.indexOf("Decision brief") < report.indexOf("Ratios"));
  assert.match(report, /Independent counts/);
  assert.match(report, /Compare sales with comparable exposure/);
});
test("post links require absolute HTTP(S) hosts without credentials", () => {
  for (const url of [
    "javascript:alert(1)",
    "/post",
    "https://user:pass@example.com/x",
    "https://@example.com/post",
    "https://:password@example.com/post",
    "https:///example.com",
    "https:example.com",
  ])
    assert.equal(safePostUrl(url), null);
  assert.equal(safePostUrl("https://example.com/post/001"), "https://example.com/post/001");
});

test("explicit technical measurement questions retain their calculation routing", () => {
  for (const question of ["How is forecast error measured?", "How is the forecast model measured?"]) {
    assert.equal(answer(question, a), technicalAnswer(question, a));
    assert.doesNotMatch(answer(question, a), /Test one offer/);
  }
  assert.match(answer("How do I measure a test?", a), /comparable exposure/);
});

test("default measurement answers return one metric; more experiments are explicit", () => {
  const multiple = { ...a, recommend: [a.recommend[0], { title: "Second", evidence: "Observed saves", action: "Second action" }, { title: "Third", evidence: "Observed questions", action: "Third action" }] };
  for (const question of ["How do I measure success?", "What success metric should I use?", "How do I measure a test?"]) {
    assert.equal(answer(question, multiple), decisionBrief(multiple).measure);
    assert.doesNotMatch(answer(question, multiple), /test one offer|second action|third action/i);
  }
  assert.match(answer("Show three experiments", multiple), /third action/i);
});
