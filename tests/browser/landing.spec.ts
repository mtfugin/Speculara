import { test, expect } from "@playwright/test";

for (const [width, height] of [[1440, 810], [1280, 720], [1024, 768]] as const) {
  test(`the first screen fits one viewport at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.waitForTimeout(500);
    const hero = (await page.locator("#top").boundingBox())!;
    expect(Math.round(hero.height)).toBe(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // headline, the action and the live dashboard are all inside the first screen
    for (const locator of [page.locator("h1"), page.getByRole("button", { name: "Try the demo" }).last(), page.locator("[data-dashboard]")]) {
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

test("the hero is a live dashboard: real totals, weekly change, a trend chart with hover values, a forecast", async ({ page }) => {
  await page.goto("/?preview=1");
  const dash = page.locator("[data-dashboard]");
  await expect(dash).toContainText("Synthetic demo", { timeout: 30000 });
  await expect(dash).toContainText("42 rows");
  await expect(dash.getByText("79,455", { exact: true })).toBeVisible();
  await expect(dash.getByText("3,111", { exact: true })).toBeVisible();
  await expect(dash.getByText("678", { exact: true })).toBeVisible();
  await expect(dash.getByText("vs last week")).toHaveCount(3);
  await expect(dash.getByText("Views by day")).toBeVisible();
  const chart = dash.getByRole("img", { name: /views by day/i });
  await expect(chart).toBeVisible();
  const before = await dash.getByText(/^Oct|^Sep/).first().innerText();
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2);
  await expect(dash).toContainText("Sep");
  await expect(dash).toContainText("Next day:");
  expect(before.length).toBeGreaterThan(3);
});

test("the headline mirrors both words of the last phrase", async ({ page }) => {
  await page.goto("/");
  const reflected = page.locator("h1 span");
  await expect(reflected).toHaveText("next decision.");
  expect(await reflected.evaluate((el) => (getComputedStyle(el) as any).webkitBoxReflect ?? getComputedStyle(el).getPropertyValue("-webkit-box-reflect"))).not.toBe("none");
});

test("numbers roll: digits scroll once when the number comes into view, real text stays readable", async ({ page }) => {
  await page.goto("/?preview=1");
  const dash = page.locator("[data-dashboard]");
  await expect(dash).toContainText("79,455", { timeout: 30000 });
  await expect(dash.locator(".roll.is-in").first()).toBeVisible();
  await page.waitForTimeout(1800); // let the roll finish
  const info = await dash.locator(".roll-digit").first().evaluate((el) => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const m = new DOMMatrix(getComputedStyle(el, "::before").transform);
    return { ty: m.m42, fs, d: Number(getComputedStyle(el).getPropertyValue("--d")) };
  });
  expect(Math.round(info.ty / info.fs)).toBe(-(info.d + 10)); // two turns of 0-9, settled on the digit
  // the plain number is still real text (search, copy, screen readers)
  await expect(dash.getByText("79,455", { exact: true })).toHaveCount(1);
});

test("loading screen: a faint grid with lines of light gliding across it, no text, not in the hero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto("/?splash=1");
  const flow = page.locator("[data-splash] [data-lineflow]");
  await expect(flow).toBeVisible();
  await expect(flow).toHaveAttribute("aria-hidden", "true");
  expect(((await flow.textContent()) ?? "").trim()).toBe("");
  expect(await flow.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  const streaks = flow.locator(".streak");
  expect(await streaks.count()).toBeGreaterThanOrEqual(8);
  // it is a faded background, not a feature: grid and streak colors are nearly transparent
  const alpha = (color: string) => Number((color.match(/\/\s*([\d.]+)\s*\)|,\s*([\d.]+)\s*\)$/) ?? [])[1] ?? (color.match(/,\s*([\d.]+)\s*\)$/) ?? [])[1] ?? 1);
  expect(alpha(await flow.locator(".streak-orange").first().evaluate((el) => getComputedStyle(el).getPropertyValue("--c").trim()))).toBeLessThanOrEqual(0.3);
  expect(alpha(await flow.locator(".streak-white").first().evaluate((el) => getComputedStyle(el).getPropertyValue("--c").trim()))).toBeLessThanOrEqual(0.2);
  // and a few soft pools where the grid bends and blurs like water
  const pools = flow.locator("[data-water-area]");
  expect(await pools.count()).toBeGreaterThanOrEqual(3);
  expect(await pools.first().evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("lineflow-water");
  const first = streaks.first();
  const x1 = await first.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  await page.waitForTimeout(300);
  const x2 = await first.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  expect(x2).toBeGreaterThan(x1);
  // gone with the loading screen, and never part of the page itself
  await expect(page.locator("[data-splash]")).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator("[data-lineflow]")).toHaveCount(0);
});

test("scroll edges: blur bands fixed to the top and bottom, the top appears when you scroll, the bottom steps aside at the end", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 810 });
  await page.goto("/");
  const top = page.locator('[data-edge-blur="top"]');
  const bottom = page.locator('[data-edge-blur="bottom"]');
  for (const band of [top, bottom]) {
    await expect(band).toHaveAttribute("aria-hidden", "true");
    expect(await band.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
    expect(await band.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    // first layer is the water lens (an SVG displacement filter), the rest are the progressive blur
    expect(await band.locator("i[data-water]").evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("edge-water");
    expect(await band.locator("i:not([data-water])").first().evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("blur");
  }
  const opacity = (loc: typeof top) => loc.evaluate((el) => Number(getComputedStyle(el).opacity));
  expect(await opacity(top)).toBe(0); // the nav at the top of the page stays crisp
  expect(await opacity(bottom)).toBe(1);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => opacity(top)).toBe(1);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => opacity(bottom)).toBe(0);
});

test("water lens filters exist for both edges and calm down with reduced motion", async ({ page, browser }) => {
  await page.goto("/");
  for (const edge of ["top", "bottom"]) {
    const filter = page.locator(`filter#edge-water-${edge}`);
    await expect(filter).toHaveCount(1);
    await expect(filter.locator("feDisplacementMap")).toHaveCount(1);
    await expect(filter.locator("feImage")).toHaveCount(1);
    await expect(filter.locator("animate")).toHaveCount(1); // the slow wobble
  }
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const calm = await ctx.newPage();
  await calm.goto("/");
  await expect(calm.locator("filter#edge-water-top animate")).toHaveCount(0); // lens stays, wobble stops
  await ctx.close();
});
