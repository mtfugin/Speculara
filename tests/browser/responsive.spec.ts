import { test, expect } from "@playwright/test";

/* Every module must fit the screen at phone, small tablet, tablet and laptop widths:
   no horizontal page scroll and no element wider than the viewport. */
const MODULES = ["Predict", "find recommendation", "get charts", "get correlation", "get sentiment", "get demand"];

for (const width of [320, 375, 768, 1024]) {
  test(`all modules fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Try synthetic demo data" }).click();
    await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", { timeout: 30000 });
    for (const m of MODULES) {
      await page.getByRole("button", { name: new RegExp(`What do you want to (get )?${m}`) }).click();
      await page.waitForTimeout(500);
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      const wide = await page.evaluate(() => {
        const limit = window.innerWidth + 1;
        const out: string[] = [];
        if (document.documentElement.scrollWidth > limit) out.push(`page scrolls: ${document.documentElement.scrollWidth}`);
        for (const el of document.querySelectorAll("main *")) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.right > limit && !el.closest("[aria-hidden='true']") && getComputedStyle(el).position !== "fixed" && !el.closest(".overflow-x-auto"))
            out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`);
        }
        return out.slice(0, 5);
      });
      expect(wide, `${m} at ${width}px`).toEqual([]);
    }
  });
}
