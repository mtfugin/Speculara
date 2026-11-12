import { test, expect } from "@playwright/test";

for (const loaded of [false, true]) {
  test(`chat remains usable on short screens (${loaded ? "loaded synthetic demo" : "empty"})`, async ({
    page,
  }) => {
    // Layout test: use the built-in answers so the reply does not depend on a live AI service.
    await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: false } }));
    await page.goto("/");
    if (loaded) {
      await page.getByRole("button", { name: "Try synthetic demo data" }).click();
      await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", {
        timeout: 30000,
      });
    }
    for (const size of [
      { width: 320, height: 420 },
      { width: 640, height: 360 },
      { width: 375, height: 620 },
    ]) {
      await page.setViewportSize(size);
      await page.getByRole("button", { name: "Open chat", exact: true }).click();
      const dialog = page.getByRole("dialog");
      const input = dialog.getByRole("textbox", { name: "Your question" });
      // Let the open animation settle: bounding boxes include transforms.
      await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.timeline === document.timeline && a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)));
      const box = (await dialog.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(8);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height - 70);
      const messages = dialog.locator('[aria-live="polite"]');
      const usableHeight = await messages.evaluate((el) => {
        const style = getComputedStyle(el);
        return el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      });
      expect(usableHeight).toBeGreaterThanOrEqual(80);
      await expect(input).toBeFocused();
      for (const control of [input, dialog.getByRole("button", { name: "Send", exact: true })]) {
        const rect = (await control.boundingBox())!;
        expect(rect.y).toBeGreaterThanOrEqual(box.y);
        expect(rect.y + rect.height).toBeLessThanOrEqual(box.y + box.height);
        expect(rect.height).toBeGreaterThanOrEqual(44);
        expect(rect.x).toBeGreaterThanOrEqual(box.x);
        expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width);
      }
      const suggestions = dialog.getByRole("group", { name: "Suggested questions" });
      await expect(suggestions.getByRole("button")).toHaveText(
        loaded
          ? ["Decision brief", "Independent counts", "Measure a test", "Explain negative"]
          : ["What next?", "Summarize totals", "Explain negative"],
      );
      // Suggestions are one horizontally scrolling row (like a system sheet): the row fits the sheet, every chip is tall enough.
      const row = (await suggestions.boundingBox())!;
      expect(row.x).toBeGreaterThanOrEqual(box.x);
      expect(row.x + row.width).toBeLessThanOrEqual(box.x + box.width + 1);
      expect(row.y + row.height).toBeLessThanOrEqual((await input.boundingBox())!.y + 1);
      for (const button of await suggestions.getByRole("button").all()) {
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      await expect(suggestions.getByRole("button").first()).toBeInViewport();
      expect(
        (await dialog.getByRole("button", { name: "Close chat", exact: true }).boundingBox())!
          .height,
      ).toBeGreaterThanOrEqual(44);
      await page.evaluate(() => window.scrollTo(0, 0));
      await input.fill("Summarize totals");
      await input.press("Enter");
      await expect(dialog).toContainText(loaded ? "678 sales" : "Upload a dataset");
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Open chat", exact: true })).toBeFocused();
    }
  });
}

test("nonmodal chat keyboard and pointer focus paths", async ({ page }) => {
  await page.goto("/");
  const launcher = page.getByRole("button", { name: "Open chat", exact: true });
  await launcher.focus();
  await launcher.press("Enter");
  const dialog = page.getByRole("dialog");
  const input = dialog.getByRole("textbox", { name: "Your question" });
  await expect(input).toBeFocused();
  await expect(dialog).not.toHaveAttribute("aria-modal", "true");
  // The focus ring is drawn on the field's pill, which wraps the input.
  expect(
    await input.evaluate((el) => {
      const pill = el.parentElement!;
      return pill.matches(":focus-within") && getComputedStyle(pill).boxShadow !== "none";
    }),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Send", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator('button[aria-expanded="true"]')).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(launcher).toBeFocused();
  await launcher.click();
  await expect(input).toBeFocused();
  await dialog.getByRole("button", { name: "Close chat", exact: true }).click();
  await expect(launcher).toBeFocused();
  await launcher.click();
  const upload = page.locator("#upload");
  for (let i = 0; i < 24 && !(await upload.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(dialog).toBeVisible();
  await expect(upload).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(launcher).toBeFocused();
});

test("module cards start locked and expose selection once data is loaded", async ({ page }) => {
  await page.goto("/");
  const list = page.getByRole("list", { name: "Questions" });
  await expect(list.getByRole("button")).toHaveCount(6);
  for (const card of await list.getByRole("button").all()) await expect(card).toBeDisabled();
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", {
    timeout: 30000,
  });
  const primary = list.getByRole("button").first();
  await expect(primary).toHaveAttribute("aria-pressed", "false");
  await primary.click();
  await expect(primary).toHaveAttribute("aria-pressed", "true");
});
