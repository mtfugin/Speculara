import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // These tests check the built-in answers, so keep them independent of a live AI service.
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: false } }));
});

const csv =
  "date,post_id,category,views,saves,sales\n" +
  Array.from(
    { length: 14 },
    (_, i) =>
      `2026-01-${String(i + 1).padStart(2, "0")},p${i},${i % 2 ? "A" : "B"},${100 + i * 10},${10 + i},${28 - i * 2}`,
  ).join("\n");
async function upload(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .locator("#upload")
    .setInputFiles({ name: "weekly.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page
    .getByRole("button", { name: "Use this dataset", exact: true })
    .click({ timeout: 30000 });
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("14 rows", {
    timeout: 30000,
  });
}
test("plain findings hide statistics and explain opposite movement in chat", async ({ page }) => {
  await upload(page);
  const recommendations = page.getByRole("region", { name: "Recommendations results" });
  await expect(recommendations.locator(":scope > ol > li")).toHaveCount(3);
  await page.getByRole("button", { name: "What do you want to get correlation of?" }).click();
  const region = page.getByRole("region", { name: "Correlation results" });
  await expect(
    region.getByText("One rises as the other falls", { exact: true }).first(),
  ).toBeVisible();
  await expect(region.getByText(/When views were higher, sales tended to be lower/)).toBeVisible();
  await expect(region.getByText(/Pearson r/).first()).toBeHidden();
  const details = region
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: "See the numbers" }) })
    .first();
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(details.getByText(/Pearson r/)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(details).not.toHaveAttribute("open", "");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Your question" }).fill("What does negative mean?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog).toContainText("not automatically bad");
  await expect(dialog).not.toContainText("Pearson");
  await dialog.getByRole("textbox", { name: "Your question" }).fill("Show Pearson statistics");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog).toContainText("Pearson");
});
test("weekly decline leads demand and forecasts keep model details closed", async ({ page }) => {
  await upload(page);
  await page.getByRole("button", { name: "What do you want to get demand of?" }).click();
  const demand = page.getByRole("region", { name: "Demand results" });
  await expect(demand.getByText(/56 sales.*down 98/s)).toBeVisible();
  await expect(demand.getByText("Interest doesn’t always turn into a purchase.")).toBeVisible();
  await expect(demand.getByText(/absolute change/).first()).toBeHidden();
  await page.getByRole("button", { name: "What do you want to Predict?" }).click();
  const forecast = page.getByRole("region", { name: "Predict results" });
  await expect(forecast.getByText("An estimate, not a guarantee.")).toBeVisible();
  await expect(forecast.getByText("Model comparison", { exact: true })).toBeHidden();
});
