import { test, expect } from "@playwright/test";
test("polish stays honest, findings copy, and reset keeps the data", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  const summary = page.getByRole("region", { name: "Dataset summary" });
  await expect(summary).toContainText("42 rows", { timeout: 30000 });
  await expect(summary.getByText("Updated just now", { exact: true })).toBeVisible();
  await expect(summary).toContainText("Synthetic demo: fictional records");
  await expect(page.getByLabel("Recommend status: Ready").first()).toHaveText("Ready");
  await expect(page.getByLabel("Predict status: Early finding").first()).toHaveText("Early finding");
  await expect(page.getByLabel("Sentiment status: Needs more data").first()).toHaveText("Needs more data");
  const recommendations = page.getByRole("region", { name: "Recommendations results" });
  await expect(recommendations.getByText("Start here", { exact: true })).toBeVisible();
  await recommendations
    .getByRole("button", { name: "Copy Recommend finding", exact: true })
    .click();
  await expect(recommendations.getByRole("status")).toHaveText("Finding copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Synthetic demo (fictional records)",
  );
  await recommendations.getByText("Why this matters", { exact: true }).click();
  await expect(
    recommendations.getByText(
      "Testing one small change helps you learn what works for your audience.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "What do you want to get sentiment of?" }).click();
  const sentiment = page.getByRole("region", { name: "Sentiment results" });
  await expect(sentiment.getByText("Needs more data", { exact: true })).toBeVisible();
  await expect(
    sentiment.getByText(/No comment text was found/).first(),
  ).toBeVisible();
  const pending = page.waitForEvent("download");
  await summary.getByRole("button", { name: "Download report", exact: true }).click();
  await pending;
  await expect(summary.getByRole("status")).toHaveText("Report download started.");
  await summary.getByRole("button", { name: "Reset view", exact: true }).click();
  await expect(page.getByRole("region", { name: "Recommendations results" })).toBeVisible();
  await expect(summary).toContainText("42 rows");
  await expect(summary.getByRole("status")).toHaveText("View reset. Your data is unchanged.");
});

test("loading states describe actual waits and failed uploads preserve freshness", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  const summary = page.getByRole("region", { name: "Dataset summary" });
  await expect(summary).toContainText("42 rows", { timeout: 30000 });
  const before = await summary.locator("time").getAttribute("datetime");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/analyze", async (route) => {
    await gate;
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Missing required counts." }),
    });
  });
  await page
    .locator("#upload")
    .setInputFiles({ name: "bad.csv", mimeType: "text/csv", buffer: Buffer.from("other\n1\n") });
  await expect(page.getByText("Checking your file...", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reset view", exact: true })).toBeDisabled();
  await expect(
    page.getByText(
      "Still waiting for the analysis service. The first request can take up to a minute.",
      { exact: true },
    ),
  ).toBeVisible({ timeout: 12000 });
  release();
  await expect(page.getByRole("alert")).toContainText("Missing required counts.");
  await expect(summary).toContainText("42 rows");
  expect(await summary.locator("time").getAttribute("datetime")).toBe(before);
});

test("blocked clipboard does not claim a finding was copied", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("blocked");
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  const region = page.getByRole("region", { name: "Recommendations results" });
  await expect(region).toBeVisible({ timeout: 30000 });
  await region.getByRole("button", { name: "Copy Recommend finding", exact: true }).click();
  await expect(region.getByRole("status")).toContainText("Copy was blocked");
  await expect(region.getByRole("status")).not.toContainText("Finding copied.");
});
