import { test, expect } from "@playwright/test";

test("profile link box is hidden unless the server enables it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Analyze a profile link")).toHaveCount(0);
});

test("profile link needs consent, then shows the normal preview", async ({ page }) => {
  let analyzed: any = null;
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { status: "ok", ai: false, profile: true } }),
  );
  await page.route("**/api/profile/analyze", async (route) => {
    analyzed = route.request().postDataJSON();
    const demo = await (await page.request.get("/demo/speculara-synthetic.csv")).body();
    const api = await page.request.post("http://127.0.0.1:8000/api/analyze", {
      headers: { "Content-Type": "application/octet-stream", "X-Filename": "upload.csv" },
      data: demo,
    });
    await route.fulfill({ json: await api.json() });
  });
  await page.goto("/");
  await page.getByText("Analyze a profile link").click();
  const analyze = page.getByRole("button", { name: "Analyze this profile" });
  const signIn = page.getByRole("button", { name: "Sign in to Instagram" });
  await page.getByLabel("Profile link").fill("https://www.instagram.com/someone");
  await expect(analyze).toBeDisabled();
  await expect(signIn).toBeDisabled();
  await page.getByRole("checkbox", { name: /I own this profile/ }).check();
  await expect(analyze).toBeEnabled();
  await analyze.click();
  await expect(page.getByRole("region", { name: /preview|dataset/i }).first()).toBeVisible({ timeout: 30000 });
  expect(analyzed.url).toBe("https://www.instagram.com/someone");
});

test("profile errors are shown in plain words", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", profile: true } }));
  await page.route("**/api/profile/analyze", (route) =>
    route.fulfill({ status: 422, json: { detail: "Use an Instagram, Facebook or TikTok profile URL." } }),
  );
  await page.goto("/");
  await page.getByText("Analyze a profile link").click();
  await page.getByLabel("Profile link").fill("https://example.com/x");
  await page.getByRole("checkbox", { name: /I own this profile/ }).check();
  await page.getByRole("button", { name: "Analyze this profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Use an Instagram" })).toBeVisible();
});

async function openProfile(page: import("@playwright/test").Page) {
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: false, profile: true } }));
  await page.goto("/");
  await page.getByText("Analyze a profile link").click();
  await page.getByLabel("Profile link").fill("https://www.tiktok.com/@examplebrand");
  await page.getByRole("checkbox", { name: /I own this profile/ }).check();
}

test("while collecting: live progress, Cancel, then a neutral cancelled message", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  let cancelled = false;
  await page.route("**/api/profile/status", (route) =>
    route.fulfill({ json: { installed: true, progress: "Reading post 3 of up to 20…", busy: true, login_open: false } }),
  );
  await page.route("**/api/profile/cancel", async (route) => {
    cancelled = true;
    release();
    await route.fulfill({ json: { cancelled: true, stopped: false, message: "Cancelling." } });
  });
  await page.route("**/api/profile/analyze", async (route) => {
    await held;
    await route.fulfill({ status: 409, json: { detail: "Collection cancelled." } });
  });
  await openProfile(page);
  await page.getByRole("button", { name: "Analyze this profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Reading post 3 of up to 20" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Cancelled. Nothing was kept." })).toBeVisible();
  expect(cancelled).toBe(true);
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0); // a cancel is not a failure
});

test("a timeout offers Try again and Try with fewer posts, which asks for 5", async ({ page }) => {
  const limits: number[] = [];
  await page.route("**/api/profile/status", (route) => route.fulfill({ json: { progress: "Loading posts…" } }));
  await page.route("**/api/profile/analyze", (route) => {
    limits.push(route.request().postDataJSON().limit);
    return route.fulfill({ status: 504, json: { detail: "The collection took too long and was stopped. Try again, or collect fewer posts." } });
  });
  await openProfile(page);
  await page.getByRole("button", { name: "Analyze this profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "took too long" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.getByRole("button", { name: "Try with fewer posts (5)" }).click();
  await expect.poll(() => limits).toEqual([10, 5]);
});

test("a profile that was not found shows the message without a retry button", async ({ page }) => {
  await page.route("**/api/profile/status", (route) => route.fulfill({ json: { progress: "Loading posts…" } }));
  await page.route("**/api/profile/analyze", (route) =>
    route.fulfill({ status: 404, json: { detail: "That profile was not found, or it is private. Check the link, then try again." } }),
  );
  await openProfile(page);
  await page.getByRole("button", { name: "Analyze this profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "not found, or it is private" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
});
