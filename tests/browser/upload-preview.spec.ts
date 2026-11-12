import { test, expect } from "@playwright/test";
const fixture = (rows = 6, synthetic = false) => ({
  schema_version: 2,
  source_kind: synthetic ? "synthetic" : "uploaded",
  rows,
  columns: ["views", "comments", "text"],
  metrics: ["views", "comments"],
  totals: { views: 50, comments: 20 },
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
  recommend: [],
  preview: {
    columns: ["views", "comments", "text"],
    total_rows: rows,
    rows: Array.from({ length: 5 }, (_, i) => ({
      views: i,
      comments: 4,
      text: i === 0 ? "javascript:alert(1)" : `row ${i}`,
    })),
  },
});
const upload = (page: import("@playwright/test").Page) =>
  page
    .locator("#upload")
    .setInputFiles({
      name: "candidate.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("views\n1\n"),
    });
const preview = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Upload preview", exact: true });
const summary = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Dataset summary" });
test("preview stages columns, five rows and six truthful statuses before confirmation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.route("**/api/analyze", (route) => route.fulfill({ json: fixture(6, true) }));
  await page.goto("/");
  await upload(page);
  const p = preview(page);
  await expect(p).toBeVisible();
  await expect(summary(page)).toHaveCount(0);
  await expect(p.getByRole("heading", { name: "Upload preview" })).toBeFocused();
  await expect(p).toContainText("Synthetic demo: fictional records");
  await expect(p).toContainText("6 rows");
  await expect(p.getByRole("columnheader")).toHaveText(["views", "comments", "text"]);
  await expect(p.locator("tbody tr")).toHaveCount(5);
  await expect(p.locator('[aria-label$="status: Needs more data"]')).toHaveCount(5);
  await expect(p.getByLabel("Charts status: Ready")).toBeVisible();
  await expect(p).toContainText("Add a text column with individual comments or reviews.");
  await expect(p.getByRole("link")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  // Bounding boxes include transforms, so let the entrance animation finish first.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  for (const button of await p.getByRole("button").all())
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await p.getByRole("button", { name: "Use this dataset", exact: true }).click();
  await expect(p).toHaveCount(0);
  await expect(summary(page)).toContainText("6 rows");
  await expect(summary(page)).toBeFocused();
});
test("cancel, failure, retry and clear preserve or replace only the intended dataset", async ({
  page,
}) => {
  let rows = 42;
  let fail = false;
  let gate: Promise<void> | undefined;
  let release!: () => void;
  await page.route("**/api/analyze", async (route) => {
    if (gate) await gate;
    await route.fulfill({
      status: fail ? 422 : 200,
      json: fail ? { detail: "Invalid counts" } : fixture(rows),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(summary(page)).toContainText("42 rows");
  const before = await summary(page).locator("time").getAttribute("datetime");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await page.getByRole("textbox", { name: "Your question" }).fill("Summarize totals");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Summarize totals");
  await page.getByRole("button", { name: "Close chat", exact: true }).first().click();
  rows = 6;
  await upload(page);
  await expect(preview(page)).toBeVisible();
  await expect(summary(page)).toContainText("42 rows");
  expect(await summary(page).locator("time").getAttribute("datetime")).toBe(before);
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Summarize totals");
  await page.getByRole("button", { name: "Close chat", exact: true }).first().click();
  await preview(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("#upload")).toBeFocused();
  await expect(summary(page)).toContainText("42 rows");
  await upload(page);
  await expect(preview(page)).toBeVisible();
  fail = true;
  gate = new Promise((resolve) => (release = resolve));
  await upload(page);
  await expect(preview(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Use this dataset" })).toHaveCount(0);
  release();
  await expect(page.getByRole("alert")).toContainText("Invalid counts");
  await expect(summary(page)).toContainText("42 rows");
  expect(await summary(page).locator("time").getAttribute("datetime")).toBe(before);
  fail = false;
  gate = undefined;
  await upload(page);
  await expect(preview(page)).toBeVisible();
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(preview(page)).toBeVisible();
  await expect(summary(page)).toContainText("42 rows");
  await preview(page).getByRole("button", { name: "Use this dataset", exact: true }).click();
  await expect(summary(page)).toContainText("6 rows");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toContainText("Summarize totals");
  await page.getByRole("button", { name: "Close chat", exact: true }).first().click();
  await upload(page);
  await expect(preview(page)).toBeVisible();
  await page.getByRole("button", { name: "Clear data", exact: true }).click();
  await expect(preview(page)).toHaveCount(0);
  await expect(summary(page)).toHaveCount(0);
});
