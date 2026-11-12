import { test, expect } from "@playwright/test";
test("decision overview, safe references and measured experiments work on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fixture = {
    schema_version: 2,
    source_kind: "synthetic",
    rows: 3,
    columns: ["views", "sales"],
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
    decision_brief: {
      changed: "Observed zero sales",
      matters: "Check the offer",
      try_next: "Test one offer",
      measure: "Compare sales with comparable exposure",
    },
    post_references: [
      { post_id: "001", post_url: "https://example.com/post/001" },
      { post_id: "002", post_url: "javascript:alert(1)" },
    ],
    recommend: [
      {
        title: "Review offer",
        evidence: "Zero sales",
        action: "Test one offer",
        success_metric: "Compare sales with comparable exposure",
        post_id: "001",
        post_url: "https://example.com/post/001",
      },
    ],
  };
  await page.route("**/api/analyze", (route) => route.fulfill({ json: fixture }));
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  const brief = page.getByRole("region", { name: "Decision brief", exact: true });
  await expect(brief).toContainText("Observed zero sales");
  const counts = page.getByRole("region", { name: "Independent counts", exact: true });
  await expect(counts).toContainText("not a tracked customer journey");
  await expect(counts).toContainText("Not Supplied");
  // post references are always shown, as a gallery of linked posts
  await expect(counts.getByRole("region", { name: "Post references" })).toBeVisible();
  await expect(counts.getByRole("link")).toHaveCount(1);
  await expect(counts.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
  const recommendations = page.getByRole("region", { name: "Recommendations results" });
  await expect(recommendations).toContainText("How to measure");
  await expect(recommendations).toContainText("Compare sales with comparable exposure");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
