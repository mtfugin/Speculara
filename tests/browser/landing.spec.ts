import { test, expect } from "@playwright/test";

const CHALLENGE_TEXT = [
  "The challenge",
  "Four buckets. Pick one.",
  "Each bucket has its own ₱10,000 prize, and Best in Show (₱50,000) can come from any of them.",
  "Choose one and build it your way, with any stack and any AI tools.",
  "ParallelOS is how Parallel solves them. You’ll see it in the keynote; you won’t build on it.",
  "[ bucket 01 ]", "Prize: Best Content · ₱10,000", "Make the work people actually stop for.",
  "Feeds are full. A studio needs hooks, craft and payoff that hold attention, made fast and on brand.",
  "A tool that turns one idea into ten distinct short videos", "A hook writer that tests Taglish openers",
  "Brand-safe image or voice variations with automatic checks",
  "[ bucket 02 ]", "Prize: Best Craftsmanship · ₱10,000", "Build something that looks and feels finished.",
  "Most hackathon projects work but feel rough. This bucket is for the product people enjoy using: great UI and UX, end to end.",
  "A dashboard a creator would open every morning", "A mobile-first tool with a flow that needs no explanation",
  "A polished front end for an AI workflow that is usually a terminal",
  "[ bucket 03 ]", "Prize: Most Unique Use of Agents · ₱10,000", "Hand agents a job nobody else thought to give them.",
  "Everyone builds a chatbot. This bucket is for agents that plan, act, check each other and get real work done on their own.",
  "Agents that run a small online shop end to end", "A team of agents where one reviews and fixes the others’ work",
  "An agent that uses a phone or browser the way a person would",
  "[ bucket 04 ]", "Prize: Most Useful for the PH Community · ₱10,000", "Build what helps Filipinos most, starting tomorrow.",
  "The best tools solve a problem people here actually have. This bucket is for builds that make life or work in the Philippines easier.",
  "A helper for government requirements and paperwork", "A tool for sari-sari stores and small sellers",
  "Something that saves commuters, OFW families or students time",
  "These are starting points, not limits. If your idea fits a bucket, it counts.",
];

test("the challenge section contains all of the supplied text, four buckets", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#challenge");
  await expect(section).toHaveCount(1);
  const text = (await section.innerText()).replace(/\s+/g, " ").toLowerCase();
  for (const phrase of CHALLENGE_TEXT) expect(text, phrase).toContain(phrase.replace(/\s+/g, " ").toLowerCase());
  await expect(section.getByRole("article")).toHaveCount(4);
  await expect(section.getByRole("heading", { level: 3 })).toHaveText(["Content", "Craftsmanship", "Agents", "PH Community"]);
});

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
