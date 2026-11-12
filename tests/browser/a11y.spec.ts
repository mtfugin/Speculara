import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const scan = async (page: any) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations
    .filter((v: any) => ["serious", "critical"].includes(v.impact))
    .map((v: any) => `${v.id}: ${v.nodes.slice(0, 3).map((n: any) => n.target.join(" ")).join(" | ")}`);

test("home screen has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(600);
  expect(await scan(page)).toEqual([]);
});

test("every module result has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", { timeout: 30000 });
  for (const q of ["Predict", "find recommendation", "get charts", "get correlation", "get sentiment", "get demand"]) {
    await page.getByRole("button", { name: new RegExp(`What do you want to (get )?${q}`) }).click();
    await page.waitForTimeout(700);
    expect(await scan(page), q).toEqual([]);
  }
});

test("chat panel and brand sheet have no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await page.waitForTimeout(500);
  expect(await scan(page)).toEqual([]);
  await page.goto("/?brand");
  await page.waitForTimeout(800);
  expect(await scan(page)).toEqual([]);
});
