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
