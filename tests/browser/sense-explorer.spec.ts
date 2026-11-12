import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

/* The Opportunity Explorer is served from /sense.html. The response is a fixed file of invented data,
   so these tests do not depend on which backend is running. */
const payload = JSON.parse(readFileSync(new URL("./fixtures/sense-demo.json", import.meta.url), "utf8"));

async function open(page: Page) {
  await page.route("**/api/sense/demo**", (route) => route.fulfill({ json: payload }));
  await page.goto("/sense.html");
  await expect(page.getByRole("heading", { name: "Opportunity Explorer" })).toBeVisible();
}

test("explorer says the data is illustrative and lists all 33 barangays", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  await expect(page.getByRole("note")).toContainText("Illustrative data");
  await expect(page.getByRole("note")).toContainText("invented");
  await expect(page.getByRole("group", { name: "Map layer" }).getByRole("button")).toHaveCount(3);
  await expect(page.locator("section[aria-labelledby=map-title] li")).toHaveCount(33);
  await expect(page.getByText(/not a geographic map/)).toBeVisible();
});

test("a barangay with no data says so and is not shown as zero", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  const urdaneta = page.getByRole("button", { name: /^Urdaneta No data yet\. This is not zero demand\./ });
  await expect(urdaneta).toContainText("No data");
});

test("ranked opportunities show quotes, doubts, a test, and never a score for insufficient evidence", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  const first = page.locator("section[aria-labelledby=ranked-title] li").first();
  await expect(first).toContainText("#1");
  await expect(first).toContainText("Candidate gap");
  await expect(first).toContainText("What people said");
  await expect(first).toContainText("What we are not sure about");
  await expect(first).toContainText("One way to test it");
  await expect(first).toContainText("not proof that nothing is served");
  const weak = page.locator("section[aria-labelledby=insufficient-title] li").first();
  await expect(weak).toContainText("Insufficient evidence");
  await expect(weak.locator("dd").first()).toHaveText("—");
  await expect(weak).not.toContainText("#");
});

test("choosing a barangay filters the list, and the layer buttons switch what the tiles count", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  await page.getByRole("button", { name: /^Bel-Air \d/ }).click();
  const cards = page.locator("section[aria-labelledby=ranked-title] > ol > li"); // direct cards only, not the quotes inside them
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Bel-Air");
  await page.getByRole("button", { name: "Show all barangays" }).click();
  await expect(cards).not.toHaveCount(1);
  const demandLayer = page.getByRole("group", { name: "Map layer" }).getByRole("button", { name: "Demand", exact: true });
  await demandLayer.click();
  await expect(demandLayer).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /^Poblacion \d/ })).toContainText("10");
});

test("how it was made lists the steps, marks the model steps as skipped, and shows the critic", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await open(page);
  await page.getByText("How this was made").click();
  for (const name of ["friction miner", "supply loader", "ghost finder", "scorer", "dossier writer", "critic"]) {
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
  }
  const steps = page.locator("section[aria-labelledby=trace-title] ol > li");
  await expect(steps).toHaveCount(8);
  await expect(steps.filter({ hasText: "Skipped" })).toHaveCount(2); // the two optional model steps, with no model
  await expect(page.getByText("Model agents are off")).toBeVisible();
  await expect(page.getByText("no problems found")).toBeVisible();
});

test("with the model agents on, the page shows which steps used a model and which summaries it wrote", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const modelPayload = JSON.parse(readFileSync(new URL("./fixtures/sense-demo-model.json", import.meta.url), "utf8"));
  await page.route("**/api/sense/demo**", (route) => route.fulfill({ json: modelPayload }));
  await page.goto("/sense.html?size=large&model=on");
  await expect(page.getByRole("heading", { name: "Opportunity Explorer" })).toBeVisible();
  const first = page.locator("section[aria-labelledby=ranked-title] > ol > li").first();
  await expect(first).toContainText("Written by a model, checked");
  await page.getByText("How this was made").click();
  await expect(page.getByText("a model chose the order of the steps")).toBeVisible();
  const steps = page.locator("section[aria-labelledby=trace-title] ol > li");
  await expect(steps.filter({ hasText: "Used a model" })).toHaveCount(2); // reader and narrator
  await expect(steps.filter({ hasText: "Skipped" })).toHaveCount(0);
  await expect(steps.filter({ hasText: "Why now:" }).first()).toBeVisible();
});

test("asking for the model on a server with none configured explains it and still shows results", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // A fixed response for a server with no model. Tests never call the real model, even if this machine has a key.
  const none = JSON.parse(readFileSync(new URL("./fixtures/sense-demo-nomodel.json", import.meta.url), "utf8"));
  await page.route("**/api/sense/demo**", (route) => route.fulfill({ json: none }));
  await page.goto("/sense.html?size=large&model=on");
  await expect(page.getByRole("heading", { name: "Opportunity Explorer" })).toBeVisible();
  await expect(page.locator("section[aria-labelledby=ranked-title] > ol > li").first()).toContainText("Candidate gap");
  await page.getByText("How this was made").click();
  await expect(page.getByText(/No model is configured/)).toBeVisible();
});

test("no sideways scrolling on a phone and no accessibility violations", async ({ page }) => {
  test.setTimeout(60000);
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
  }
});

test("a failed load shows a clear message", async ({ page }) => {
  await page.route("**/api/sense/demo**", (route) => route.fulfill({ status: 500, json: { detail: "boom" } }));
  await page.goto("/sense.html");
  await expect(page.getByRole("alert")).toContainText("Check that the analysis service is running");
});

test("the larger invented dataset (?size=large) loads from the real backend and shows every kind of result", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/sense.html?size=large");
  await expect(page.getByRole("heading", { name: "Opportunity Explorer" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Illustrative data");
  // 12 of the 33 barangays have data; the rest say so instead of showing zero
  await expect(page.locator("section[aria-labelledby=map-title] li button", { hasText: "No data" })).toHaveCount(21);
  const cards = page.locator("section[aria-labelledby=ranked-title] > ol > li");
  await expect(cards.first()).toContainText("Candidate gap");
  await expect(cards.filter({ hasText: "Covered" }).first()).toBeVisible();
  await expect(cards.filter({ hasText: "Supply unknown" }).first()).toBeVisible();
  await expect(cards.filter({ hasText: "Demand only" }).first()).toBeVisible();
  await expect(page.locator("section[aria-labelledby=insufficient-title] > ul > li")).toHaveCount(2);
  await page.screenshot({ path: "docs/screenshots/sense-explorer-large.png", fullPage: true });
});
