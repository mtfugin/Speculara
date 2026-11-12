import { test, expect } from "@playwright/test";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  // These tests check the built-in answers, so keep them independent of a live AI service.
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: false } }));
});

const demo = (name: string) => path.resolve("public/demo", name);
const choose = async (page: import("@playwright/test").Page, module: string) =>
  page.getByRole("button", { name: module }).click();
const summary = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Dataset summary" });

test("real CSV workflow, six modules, chat and report export", async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(summary(page)).toContainText("42 rows; 5 numeric metrics", { timeout: 30000 });
  await expect(page.getByText("Your next decisions")).toBeVisible();
  await choose(page, "What do you want to Predict?");
  const prediction = page.getByRole("region", { name: "Predict results" });
  await expect(prediction.getByText("An estimate, not a guarantee.")).toBeVisible();
  await expect(prediction.getByText("Model comparison", { exact: true })).toBeHidden();
  await prediction.getByText("See the numbers", { exact: true }).click();
  await expect(prediction.getByRole("rowheader", { name: "linear", exact: true })).toBeVisible();
  await expect(
    prediction.getByRole("rowheader", { name: "last_value", exact: true }),
  ).toBeVisible();
  await choose(page, "What do you want to get charts of?");
  const charts = page.getByRole("region", { name: "Charts results" });
  await expect(charts.getByText("Total views", { exact: true })).toBeVisible();
  await expect(charts.getByRole("heading", { name: "Rankings", exact: true })).toBeHidden();
  await charts.getByText("See the numbers", { exact: true }).click();
  await expect(charts.getByRole("heading", { name: "Rankings", exact: true })).toBeVisible();
  await charts.getByText("See the numbers", { exact: true }).click();
  await page.screenshot({ path: "docs/screenshots/plain-desktop.png", fullPage: true });
  await choose(page, "What do you want to get correlation of?");
  const connections = page.getByRole("region", { name: "Correlation results" });
  await expect(connections.getByText(/Pearson r/).first()).toBeHidden();
  await expect(
    connections.getByText("This pattern doesn’t prove what caused the change."),
  ).toBeVisible();
  await choose(page, "What do you want to get sentiment of?");
  await expect(
    page
      .getByRole("region", { name: "Sentiment results" })
      .getByText("Add a text column with individual comments or reviews."),
  ).toBeVisible();
  await choose(page, "What do you want to get demand of?");
  const demand = page.getByRole("region", { name: "Demand results" });
  await expect(demand.getByText("Sales in latest week", { exact: true })).toBeVisible();
  await expect(demand.getByText("Interest doesn’t always turn into a purchase.")).toBeVisible();
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Your question" })
    .fill("Summarize totals");
  await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("678 sales");
  await expect(page.getByRole("dialog")).not.toContainText("Pearson");
  await page.getByRole("button", { name: "Close chat", exact: true }).first().click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download report", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("speculara-report.md");
  const stream = await download.createReadStream(),
    chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const report = Buffer.concat(chunks).toString();
  for (const text of [
    "SYNTHETIC DEMO",
    "Full computed results",
    "Decision brief",
    "Independent counts",
    "How to measure",
    "Pearson",
    "Ratios",
    "Period comparisons",
    "Rankings",
  ])
    expect(report).toContain(text);
  expect(errors).toEqual([]);
});

test("XLSX upload, text-only replacement, errors and clear", async ({ page }) => {
  await page.goto("/");
  await page.locator("#upload").setInputFiles(demo("speculara-synthetic.xlsx"));
  await page
    .getByRole("button", { name: "Use this dataset", exact: true })
    .click({ timeout: 30000 });
  await expect(summary(page)).toContainText("Synthetic demo: fictional records", {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Your question" })
    .fill("Summarize totals");
  await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("678 sales");
  await page.getByRole("button", { name: "Close chat", exact: true }).first().click();
  await page.locator("#upload").setInputFiles({
    name: "invalid.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("views\n-1\n"),
  });
  await expect(page.getByRole("alert")).toContainText("nonnegative");
  await expect(summary(page)).toContainText("42 rows");
  await page.locator("#upload").setInputFiles(demo("speculara-text-synthetic.csv"));
  await page
    .getByRole("button", { name: "Use this dataset", exact: true })
    .click({ timeout: 30000 });
  await expect(summary(page)).toContainText("6 rows; 0 numeric metrics");
  await choose(page, "What do you want to get sentiment of?");
  const sentiment = page.getByRole("region", { name: "Sentiment results" });
  await expect(sentiment.getByText("Based on a simple word check")).toBeVisible();
  await expect(sentiment.getByText("Negative", { exact: true })).toBeVisible();
  await expect(sentiment.getByText(/Reads \d+ comments/)).toBeVisible();
  await expect(sentiment.getByText(/lexicon/)).toBeHidden();
  await choose(page, "What do you want to Predict?");
  await expect(
    page
      .getByRole("region", { name: "Predict results" })
      .getByText(
        "Add dates and daily sales or views. Use 14 to 365 consecutive days with no missing counts.",
      ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toContainText("678 sales");
  await page.getByRole("button", { name: "Close chat", exact: true }).first().click();
  await page.getByRole("button", { name: "Clear data", exact: true }).click();
  await expect(summary(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "What do you want to Predict?" })).toBeDisabled();
});

test("mobile has no page overflow and supports keyboard details", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(summary(page)).toBeVisible({ timeout: 30000 });
  await choose(page, "What do you want to get charts of?");
  const charts = page.getByRole("region", { name: "Charts results" });
  const details = charts.getByText("See the numbers", { exact: true });
  await details.focus();
  await page.keyboard.press("Enter");
  await expect(charts.getByRole("heading", { name: "Rankings", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Enter");
  await page.locator("body").click({ position: { x: 2, y: 2 } });
  await page.screenshot({ path: "docs/screenshots/plain-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("320px layout tolerates large counts and API failure retains dataset", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 });
  await page.goto("/");
  await page.locator("#upload").setInputFiles({
    name: "large-counts.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "date,views,sales\n2026-01-01,1000000000000,1000000000000\n2026-01-02,1000000000000,1000000000000\n",
    ),
  });
  await page
    .getByRole("button", { name: "Use this dataset", exact: true })
    .click({ timeout: 30000 });
  await expect(summary(page)).toContainText("2 rows", { timeout: 30000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.route("**/api/analyze", (route) => route.abort());
  await page
    .locator("#upload")
    .setInputFiles({ name: "next.csv", mimeType: "text/csv", buffer: Buffer.from("views\n1\n") });
  await expect(page.getByRole("alert")).not.toBeEmpty();
  await expect(summary(page)).toContainText("large-counts.csv");
});

test("duplicate numeric post IDs keep evidence available in details", async ({ page }) => {
  await page.goto("/");
  await page.locator("#upload").setInputFiles({
    name: "repeated.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("post_id,views,sales\na,100,2\na,200,3\n"),
  });
  await page
    .getByRole("button", { name: "Use this dataset", exact: true })
    .click({ timeout: 30000 });
  await expect(summary(page)).toContainText("2 rows", { timeout: 30000 });
  await choose(page, "What do you want to get charts of?");
  const charts = page.getByRole("region", { name: "Charts results" });
  await charts.getByText("See the numbers", { exact: true }).click();
  await expect(
    charts.getByText("Repeated post IDs make snapshots versus increments ambiguous.").first(),
  ).toBeVisible();
  await expect(charts.getByText(/5 sales \/ 300 views/).first()).toBeVisible();
});
