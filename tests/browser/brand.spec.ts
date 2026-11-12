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

test("design tokens are applied: Bricolage headings, Inter text, Sora wordmark, flat surfaces", async ({ page }) => {
  await page.goto("/");
  const h1 = await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1).toContain("Bricolage Grotesque");
  const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(body).toContain("Inter");
  const section = await page.locator("h2").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(section).toContain("Bricolage Grotesque");
  const word = await page.locator(".font-wordmark").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(word).toContain("Sora");
  const card = await page.locator(".surface").first().evaluate((el) => {
    const s = getComputedStyle(el);
    return { border: s.borderTopWidth, radius: s.borderTopLeftRadius };
  });
  expect(card.border).toBe("1px");
  expect(card.radius).toBe("24px");
});

test("hero banner: one h1, nav links, mobile menu opens and closes, actions work", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toContainText("into the next decision.");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Questions" })).toHaveAttribute("href", "#questions");
  // The hero is one screen: text and upload card side by side, no filler rows.
  const hero = await page.locator("#top").boundingBox();
  expect(Math.round(hero!.height)).toBe(await page.evaluate(() => innerHeight));
  await expect(page.getByText(/Built for/)).toHaveCount(0);
  // The primary action starts the demo.
  await page.getByRole("button", { name: "Try the demo" }).first().click();
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", { timeout: 30000 });
});

test("hero banner mobile menu is reachable, closes with Escape and on choosing a link", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  await toggle.click();
  const close = page.getByRole("button", { name: "Close menu" });
  await expect(close).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Questions" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await page.getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
});
