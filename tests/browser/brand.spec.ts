import { test, expect } from "@playwright/test";

test("brand sheet renders every system section without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("/?brand");
  for (const id of ["logo", "color", "type", "geometry", "components", "icons", "patterns", "illustrations", "motion"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length);
  expect(broken).toBe(0);
  expect(errors).toEqual([]);
});

test("logo is exposed once, with the brand name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Speculara" }).first()).toBeVisible();
});

test("signature splash plays once, can be skipped, and never runs with reduced motion", async ({ page, browser }) => {
  await page.goto("/?splash=1");
  const splash = page.locator("[data-splash]");
  await expect(splash).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(splash).toHaveCount(0, { timeout: 2000 });
  // The app underneath is usable straight away.
  await expect(page.getByRole("button", { name: "Try synthetic demo data" })).toBeEnabled();

  const reduced = await browser.newContext({ reducedMotion: "reduce" });
  const calm = await reduced.newPage();
  await calm.goto("/?splash=1");
  await expect(calm.locator("[data-splash]")).toHaveCount(0);
  await reduced.close();
});

test("design tokens are applied: Sora headings, Manrope text, flat surfaces", async ({ page }) => {
  await page.goto("/");
  const h1 = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1).toContain("Sora");
  const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(body).toContain("Manrope");
  const card = await page.locator(".surface").first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { border: s.borderTopWidth, radius: s.borderTopLeftRadius };
  });
  expect(card.border).toBe("1px");
  expect(card.radius).toBe("16px");
});
