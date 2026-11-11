import test from "node:test";
import assert from "node:assert/strict";
import {
  relationshipSummary,
  friendlyUnavailable,
  answer,
  demandSummary,
  periodSummary,
} from "../src/analysis.ts";
test("plain relationship thresholds and opposite movement", () => {
  const pair = {
    a: "views",
    b: "sales",
    r: -0.8,
    n: 4,
    p: 0.1,
    spearman_r: -0.8,
    spearman_p: 0.1,
    small_sample: true,
  };
  assert.equal(relationshipSummary(pair).direction, "Move in opposite directions");
  assert.equal(relationshipSummary({ ...pair, r: 0.299 }).strength, "No clear pattern");
  assert.equal(relationshipSummary({ ...pair, r: 0.3 }).strength, "Some connection");
  assert.equal(relationshipSummary({ ...pair, r: 0.7 }).strength, "Strong connection");
  assert.match(friendlyUnavailable("ranking", "Repeated post IDs"), /repeated names/i);
});

test("default answers stay plain; explicit statistics remain available", () => {
  const fixture = {
    schema_version: 2,
    source_kind: "uploaded",
    columns: [],
    metrics: ["sales"],
    missing: {},
    charts: {},
    ratios: {},
    periods: {},
    rankings: { categories: {}, posts: {} },
    rows: 4,
    totals: { sales: 0 },
    warnings: [],
    correlation: [
      {
        a: "views",
        b: "sales",
        r: -0.8,
        n: 4,
        p: 0.1,
        spearman_r: -0.8,
        spearman_p: 0.1,
        small_sample: true,
      },
    ],
    predict: { available: false, reason: "Need data" },
    sentiment: { available: false, reason: "Need text" },
    demand: { available: true, reason: null, sales: 0, saves: 9 },
    recommend: [
      { title: "First", evidence: "4 entries.", action: "Review them." },
      { title: "Second", evidence: "4 entries.", action: "Compare them." },
    ],
  } as import("../src/analysis.ts").Analysis;
  assert.match(
    answer("negative comments", {
      ...fixture,
      sentiment: { available: true, reason: null, counts: { positive: 2, negative: 1 }, n: 3 },
    }),
    /negative \(1 entries\)/,
  );
  assert.doesNotMatch(
    answer("negative comments", {
      ...fixture,
      sentiment: { available: true, reason: null, counts: { positive: 2, negative: 1 }, n: 3 },
    }),
    /opposite directions/,
  );
  assert.match(
    demandSummary({
      ...fixture,
      totals: {},
      demand: { available: true, reason: null, inquiries: 1 },
    }),
    /1 entry contains a question/,
  );
  assert.match(answer("Who won the election?", fixture), /cannot fetch accounts/);
  assert.equal(demandSummary(fixture), "The dataset records 0 sales.");
  assert.doesNotMatch(answer("recommend", fixture), /Second/);
  assert.match(answer("more recommendations", fixture), /Second/);
  assert.match(answer("Show Pearson statistics", fixture), /Pearson/);
  assert.match(answer("negative correlation meaning", fixture), /not automatically bad/);
  assert.match(answer("negative correlation meaning", fixture), /tended to be lower/);
  assert.doesNotMatch(answer("correlation", fixture), /Pearson|Spearman|p-value/);
  assert.match(
    periodSummary("sales", {
      available: true,
      reason: null,
      current_start: null,
      current_end: null,
      previous_start: null,
      previous_end: null,
      current_total: 0,
      previous_total: 0,
      absolute_change: 0,
      percent_change: null,
      percent_change_reason: "zero",
    }),
    /previous week had no sales/,
  );
});

test("saves rates and rankings keep their metric", () => {
  const ratio = {
    available: true,
    reason: null,
    numerator_metric: "saves",
    denominator_metric: "views",
    numerator: 9,
    denominator: 100,
    percent: 9,
    n: 3,
    excluded_rows: 0,
    zero_view_rows: 0,
    notes: [],
  } as const;
  const a = {
    metrics: ["saves"],
    ratios: { saves_per_view: ratio },
    rankings: {
      posts: {
        saves_per_view: {
          available: true,
          reason: null,
          rows: [{ label: "A", numerator: 9, views: 100, percent: 9, n: 3 }],
          excluded_groups: 0,
        },
      },
      categories: {},
    },
  } as unknown as import("../src/analysis.ts").Analysis;
  assert.match(answer("saves rate", a), /9 saves/);
  assert.match(answer("best post saves", a), /9 saves/);
  assert.doesNotMatch(answer("best post saves", a), /sales/);
});

test("relationship directions and sample boundary stay faithful", () => {
  const pair = {
    a: "views",
    b: "sales",
    r: 0,
    n: 10,
    p: 1,
    spearman_r: 0,
    spearman_p: 1,
    small_sample: false,
  };
  for (const r of [0, 0.1, -0.1])
    assert.equal(relationshipSummary({ ...pair, r }).direction, "No clear pattern");
  for (const r of [0.3, 0.7, 1])
    assert.equal(relationshipSummary({ ...pair, r }).direction, "Move together");
  for (const r of [-0.3, -0.7, -1])
    assert.equal(relationshipSummary({ ...pair, r }).direction, "Move in opposite directions");
  assert.match(relationshipSummary({ ...pair, n: 9 }).note, /Early finding/);
  assert.doesNotMatch(relationshipSummary(pair).note, /Early finding/);
  assert.match(
    periodSummary("sales", {
      available: true,
      reason: null,
      current_start: null,
      current_end: null,
      previous_start: null,
      previous_end: null,
      current_total: 2,
      previous_total: 100,
      absolute_change: -98,
      percent_change: -98,
      percent_change_reason: null,
    }),
    /down 98/,
  );
  assert.match(
    periodSummary("sales", {
      available: false,
      reason: "Missing dates",
      current_start: null,
      current_end: null,
      previous_start: null,
      previous_end: null,
      current_total: null,
      previous_total: null,
      absolute_change: null,
      percent_change: null,
      percent_change_reason: null,
    }),
    /two full weeks/,
  );
});

test('distinct sales and saves fixtures preserve intent routing', () => {
  const ratio = (metric: string, numerator: number) => ({available:true,reason:null,numerator_metric:metric,denominator_metric:'views',numerator,denominator:100,percent:numerator,n:3,excluded_rows:0,zero_view_rows:0,notes:[]});
  const fixture = {metrics:['views','sales','saves'],ratios:{sales_per_view:ratio('sales',2),saves_per_view:ratio('saves',19)},rankings:{categories:{},posts:{sales_per_view:{available:true,reason:null,rows:[{label:'SalesPost',numerator:2,views:100,percent:2,n:3}],excluded_groups:0},saves_per_view:{available:true,reason:null,rows:[{label:'SavedPost',numerator:19,views:100,percent:19,n:3}],excluded_groups:0}}},recommend:[{title:'Firstrec',evidence:'2 sales.',action:'Check checkout.'}],predict:{available:true,reason:null,metric:'sales',points:[{label:'2026-01-15',value:7}]},correlation:[],periods:{},totals:{sales:2,saves:19},rows:3} as unknown as import('../src/analysis.ts').Analysis;
  assert.match(answer('saves per views',fixture),/19 saves/);
  assert.match(answer('best post saves per view',fixture),/SavedPost/);
  assert.doesNotMatch(answer('sales per views',{...fixture,ratios:{saves_per_view:fixture.ratios.saves_per_view}}),/19 saves/);
  assert.match(answer('next-day forecast',fixture),/about 7 sales/);
  assert.match(answer('What should I change next?',fixture),/Firstrec/);
});
