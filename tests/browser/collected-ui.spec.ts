import { test, expect, type Page } from "@playwright/test";

/* A small, fake collected profile: same shape the server returns, invented content. */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

async function collected(page: Page) {
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: false, profile: true } }));
  await page.route("**/api/profile/analyze", async (route) => {
    const demo = await (await page.request.get("/demo/speculara-synthetic.csv")).body();
    const api = await page.request.post("http://127.0.0.1:8000/api/analyze", {
      headers: { "Content-Type": "application/octet-stream", "X-Filename": "upload.csv" },
      data: demo,
    });
    const body = await api.json();
    body.profile = { platform: "TikTok", handle: "examplebrand", nickname: "Example Brand", followers: 1234567, avatar: PNG };
    body.provenance = {
      source: "TikTok", handle: "examplebrand", collector: "socialmonitor", method: "playwright browser, signed out",
      collected_at: "2026-11-12T04:00:00+00:00", posts: 10,
      metrics: { likes: { observed: 10, blank: 0 }, comments: { observed: 10, blank: 0 }, shares: { observed: 10, blank: 0 }, views: { observed: 9, blank: 1 } },
      comments: { read: 465, kept: 400 }, inferred: false,
    };
    body.data_table = {
      columns: ["date", "post_id", "post_url", "category", "views", "likes", "comments", "text"],
      rows: [
        { date: "2026-11-11", post_id: "p1", post_url: "https://www.tiktok.com/@examplebrand/video/p1", category: "Video", views: 31600, likes: 932, comments: 159, text: null },
        { date: "2026-11-11", post_id: "p1", post_url: "https://www.tiktok.com/@examplebrand/video/p1", category: "Video", views: null, likes: null, comments: null, text: "Magkano po, with a comma?" },
      ],
      total_rows: 2,
    };
    body.post_references = [{ post_id: "p1", post_url: "https://www.tiktok.com/@examplebrand/video/p1", thumb_url: PNG }];
    await route.fulfill({ json: body });
  });
  await page.goto("/");
  await page.getByText("Analyze a profile link").click();
  await page.getByLabel("Profile link").fill("https://www.tiktok.com/@examplebrand");
  await page.getByRole("checkbox", { name: /I own this profile/ }).check();
  await page.getByRole("button", { name: "Analyze this profile" }).click();
}

test("collected preview: who it is, where it came from, downloads, and no sideways scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await collected(page);
  const preview = page.getByRole("region", { name: "Upload preview" });
  await expect(preview).toBeVisible();
  await expect(preview.getByText("Example Brand")).toBeVisible();
  await expect(preview.getByText("1,234,567")).toBeVisible();
  await expect(preview.getByText(/Collected from TikTok @examplebrand · playwright browser, signed out/)).toBeVisible();
  await expect(preview.getByAltText("Example Brand profile picture")).toBeVisible();
  // the latest posts show their counts with the category, not raw dashes
  const latest = preview.getByRole("list", { name: "First posts" });
  await expect(latest.getByRole("listitem")).toHaveCount(1);
  await expect(latest).toContainText("Video");
  await expect(latest).toContainText("31,600");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await preview.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);

  const [csv] = await Promise.all([page.waitForEvent("download"), preview.getByRole("button", { name: "Download data (CSV)" }).click()]);
  expect(csv.suggestedFilename()).toMatch(/^speculara-tiktok-examplebrand-\d{4}-\d{2}-\d{2}\.csv$/);
  const text = (await (await import("node:fs/promises")).readFile((await csv.path())!, "utf8"));
  expect(text.charCodeAt(0)).toBe(0xfeff); // opens correctly in Excel
  expect(text).toContain("date,post_id,post_url,category,views,likes,comments,text");
  expect(text).toContain('"Magkano po, with a comma?"'); // a comma inside a comment is quoted
  const [pic] = await Promise.all([page.waitForEvent("download"), preview.getByRole("link", { name: "Download profile picture" }).click()]);
  expect(pic.suggestedFilename()).toBe("tiktok-examplebrand-profile.png");
});

test("metric tiles: the same size for numbers and Not Supplied, and long values slide on hover", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await collected(page);
  await page.getByRole("button", { name: "Use this dataset" }).click();
  const counts = page.getByRole("region", { name: "Independent counts", exact: true });
  await expect(counts).toContainText("Not Supplied");
  const sizes = await counts.locator(".metric-tile dd.tabular").evaluateAll((els) => els.map((el) => getComputedStyle(el).fontSize + "/" + el.getBoundingClientRect().height));
  expect(new Set(sizes).size).toBe(1); // every value row has the same type size and height
  const tops = await counts.locator(".metric-tile").evaluateAll((els) => els.map((el) => Math.round(el.querySelector("dd.tabular")!.getBoundingClientRect().top - el.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1); // the value sits at the same place in every tile

  // a value wider than its tile is cut with an ellipsis and slides sideways on hover
  const fit = counts.locator(".fit").first();
  await fit.evaluate((el) => {
    (el as HTMLElement).style.width = "60px";
  });
  await expect(fit).toHaveAttribute("data-clipped", "true");
  await expect(fit).toHaveAttribute("title", /./);
  await fit.hover();
  await expect.poll(() => fit.locator(".fit__in").evaluate((el) => getComputedStyle(el).animationName)).toBe("fit-slide");
});

test("module rail: only modules with data, follows the card on screen, droplet moves, unused question cards are grey", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", { timeout: 30000 });
  // the synthetic file has no comments: Sentiment cannot be answered, so its question card is grey
  const sentimentCard = page.getByRole("button", { name: /What do you want to get sentiment of\?/ });
  await expect(sentimentCard).toHaveClass(/module-unused/);
  await expect(page.getByRole("button", { name: /What do you want to get charts of\?/ })).not.toHaveClass(/module-unused/);
  // no module card on screen yet, so no rail
  await expect(page.getByRole("navigation", { name: "Modules" })).toHaveCount(0);
  await page.getByRole("button", { name: /What do you want to get charts of\?/ }).click();
  await page.locator('[data-module="charts"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('[data-module="charts"]')!.scrollIntoView({ block: "center" }));
  const rail = page.getByRole("navigation", { name: "Modules" });
  await expect(rail).toBeVisible();
  // only the five modules that have data
  await expect(rail.getByRole("button")).toHaveCount(5);
  await expect(rail.getByRole("button", { name: "Go to Sentiment" })).toHaveCount(0);
  await expect(rail.getByRole("button", { name: "Go to Charts" })).toHaveAttribute("aria-pressed", "true");
  const drop = rail.locator(".module-rail__drop");
  await expect(drop).toHaveAttribute("data-on", "true");
  const y1 = await drop.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  // scroll to the second card: the highlight and the droplet move to it
  const other = await page.evaluate(() => [...document.querySelectorAll("[data-module]")].map((e) => (e as HTMLElement).dataset.module));
  expect(other.length).toBe(2);
  await page.evaluate((k) => document.querySelector(`[data-module="${k}"]`)!.scrollIntoView({ block: "center" }), other[1]);
  await expect(rail.locator(".module-rail__btn.is-active")).toHaveCount(1);
  await expect(rail.locator(".module-rail__btn.is-active")).not.toHaveAttribute("title", "Charts");
  await expect.poll(() => drop.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)).not.toBe(y1);
  // the droplet is plain orange
  expect(await rail.locator(".module-rail__blob").evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
  // and the rail leaves when no module card is on screen
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByRole("navigation", { name: "Modules" })).toHaveCount(0);
});

test("scrolling stays light: the water lens rests while the page moves and returns after", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForTimeout(500);
  const water = page.locator('[data-edge-blur="top"] i[data-water]');
  await expect(page.locator("html")).not.toHaveAttribute("data-scrolling", "");
  await page.evaluate(() => window.scrollTo(0, 400));
  await expect(page.locator("html")).toHaveAttribute("data-scrolling", "");
  expect(await water.evaluate((el) => getComputedStyle(el).visibility)).toBe("hidden");
  await expect(page.locator("html")).not.toHaveAttribute("data-scrolling", "", { timeout: 2000 });
  expect(await water.evaluate((el) => getComputedStyle(el).visibility)).toBe("visible");
  // two blur layers plus the lens, not five
  expect(await page.locator('[data-edge-blur="top"] i:not([data-water])').count()).toBe(2);
});
