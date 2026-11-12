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
  await page.getByRole("textbox", { name: "Profile link", exact: true }).fill("https://www.tiktok.com/@examplebrand");
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

test("module rail: lists every module, dims the ones without data, follows the section on screen, droplet moves", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", { timeout: 30000 });
  // the synthetic file has no comments: Sentiment cannot be answered, so its question card is grey
  const sentimentCard = page.getByRole("button", { name: /What do you want to get sentiment of\?/ });
  await expect(sentimentCard).toHaveClass(/module-unused/);
  await expect(page.getByRole("button", { name: /What do you want to get charts of\?/ })).not.toHaveClass(/module-unused/);
  // the module sections are not in the middle of the window yet, so the rail is tucked away
  await expect(page.locator("nav.module-rail")).toHaveAttribute("data-hidden", "true");
  await page.getByRole("button", { name: /What do you want to get charts of\?/ }).click();
  await page.locator('[data-module="charts"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('[data-module="charts"]')!.scrollIntoView({ block: "center" }));
  const rail = page.getByRole("navigation", { name: "Modules" });
  await expect(rail).toBeVisible();
  // every module has its own section now, so all six are listed; the ones this data cannot answer are dimmed
  await expect(rail.getByRole("button")).toHaveCount(6);
  await expect(rail.getByRole("button", { name: "Go to Sentiment" })).toHaveClass(/opacity-60/);
  await expect(rail.getByRole("button", { name: "Go to Charts" })).not.toHaveClass(/opacity-60/);
  await expect(rail.getByRole("button", { name: "Go to Charts" })).toHaveAttribute("aria-pressed", "true");
  const drop = rail.locator(".module-rail__head");
  await expect(rail.locator(".module-rail__drop")).toHaveAttribute("data-on", "true");
  // Charts is the third icon, so wait for the droplet to settle there before taking its position
  await expect.poll(() => drop.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)).toBeGreaterThan(0);
  const y1 = await drop.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  // scroll to another section: the highlight and the droplet move to it
  const other = await page.evaluate(() => [...document.querySelectorAll("[data-module]")].map((e) => (e as HTMLElement).dataset.module));
  expect(other.length).toBe(6);
  const next = other.find((k) => k !== "charts")!;
  await page.evaluate((k) => document.querySelector(`[data-module="${k}"]`)!.scrollIntoView({ block: "center" }), next);
  await expect(rail.locator(".module-rail__btn.is-active")).toHaveCount(1);
  await expect(rail.locator(".module-rail__btn.is-active")).not.toHaveAttribute("title", "Charts");
  await expect.poll(() => drop.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)).not.toBe(y1);
  // the droplet is plain orange: a head, a trailing bubble, joined by a goo filter, with no overshoot in its easing
  expect(await rail.locator(".module-rail__head").evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
  await expect(rail.locator(".module-rail__tail")).toHaveCount(1);
  expect(await rail.locator(".module-rail__drop").evaluate((el) => getComputedStyle(el).filter)).toContain("rail-goo");
  const easing = await rail.locator(".module-rail__head").evaluate((el) => getComputedStyle(el).transitionTimingFunction);
  expect(easing).not.toMatch(/-?\d\.\d*[1-9]\)?$/); // cubic-bezier(0.4, 0, 0.2, 1): every control value within 0 to 1
  expect(easing).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
  // and the rail tucks away again when the sections are not in the middle of the window
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator("nav.module-rail")).toHaveAttribute("data-hidden", "true");
});

test("scrolling stays light: the water lens rests while the page moves and returns after", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.waitForTimeout(500);
  const water = page.locator('[data-edge-blur="top"] i[data-water]');
  await expect(page.locator("html")).not.toHaveAttribute("data-scrolling", "");
  // scrolling marks the page for ~100ms, so read it in the same moment as the scroll
  // (watched with an observer, so a slow machine cannot miss the short window)
  const marked = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const root = document.documentElement;
        const watch = new MutationObserver(() => {
          if (root.hasAttribute("data-scrolling")) {
            watch.disconnect();
            resolve(true);
          }
        });
        watch.observe(root, { attributes: true, attributeFilter: ["data-scrolling"] });
        window.scrollTo(0, 400);
        setTimeout(() => resolve(false), 2000);
      }),
  );
  expect(marked).toBe(true);
  await expect(page.locator("html")).not.toHaveAttribute("data-scrolling", "", { timeout: 2000 });
  // while marked, the lens fades out (opacity, not visibility); when the page rests it returns
  await page.evaluate(() => document.documentElement.setAttribute("data-scrolling", ""));
  await expect.poll(() => water.evaluate((el) => getComputedStyle(el).opacity)).toBe("0");
  await page.evaluate(() => document.documentElement.removeAttribute("data-scrolling"));
  await expect.poll(() => water.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
  // two blur layers plus the lens, not five
  expect(await page.locator('[data-edge-blur="top"] i:not([data-water])').count()).toBe(2);
});
