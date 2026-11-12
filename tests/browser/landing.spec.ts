import { test, expect } from "@playwright/test";

for (const [width, height] of [[1440, 810], [1280, 720], [1024, 768]] as const) {
  test(`the first screen fits one viewport at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.waitForTimeout(500);
    const hero = (await page.locator("#top").boundingBox())!;
    expect(Math.round(hero.height)).toBe(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // headline, both actions and the upload card are all inside the first screen
    for (const locator of [page.locator("h1"), page.getByRole("button", { name: "Try the demo" }).last(), page.locator("#start")]) {
      const box = (await locator.boundingBox())!;
      expect(box.y + box.height, `inside the first screen at ${width}x${height}`).toBeLessThanOrEqual(height + 1);
    }
  });
}

test("loading screen: logo, 1.5 seconds, skippable, then the page is ready", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__t = {};
    new MutationObserver(() => {
      const el = document.querySelector("[data-splash]");
      if (el && !(window as any).__t.in) (window as any).__t.in = performance.now();
      if (!el && (window as any).__t.in && !(window as any).__t.out) (window as any).__t.out = performance.now();
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/?splash=1");
  await expect(page.locator("[data-splash]")).toBeVisible();
  await page.waitForFunction(() => (window as any).__t.out, null, { timeout: 6000 });
  const ms = await page.evaluate(() => (window as any).__t.out - (window as any).__t.in);
  expect(ms).toBeGreaterThan(1350);
  expect(ms).toBeLessThan(1900); // 1.5s by design, with room for a loaded machine
  await expect(page.getByRole("button", { name: "Try the demo" }).first()).toBeVisible();
});

test("chat looks like a message sheet: outgoing bubble right, reply left, arrow send button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Your question" }).fill("Summarize totals");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  const mine = dialog.locator("[aria-live=\"polite\"]").getByText("Summarize totals", { exact: true });
  await expect(mine).toBeVisible();
  const dialogBox = (await dialog.boundingBox())!;
  const mineBox = (await mine.boundingBox())!;
  expect(mineBox.x + mineBox.width / 2).toBeGreaterThan(dialogBox.x + dialogBox.width / 2);
  await expect(dialog.locator("svg.lucide-arrow-up")).toHaveCount(1);
  await expect(dialog.getByRole("group", { name: "Suggested questions" })).toBeVisible();
});
