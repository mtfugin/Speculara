import { test, expect, type Page } from "@playwright/test";

async function loadDemo(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", {
    timeout: 30000,
  });
}

async function ask(page: Page, question: string) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Your question" }).fill(question);
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  return dialog;
}

test("no AI badge or AI request when the server has AI off", async ({ page }) => {
  let called = false;
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: false } }));
  await page.route("**/api/ai/chat", (route) => {
    called = true;
    return route.fulfill({ json: { answer: "x" } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = await ask(page, "Summarize totals");
  await expect(dialog).toContainText("Upload a dataset");
  await expect(dialog.getByLabel("AI answers on")).toHaveCount(0);
  expect(called).toBe(false);
});

test("AI is the default, has no switch, and only a summary is sent", async ({ page }) => {
  let sent: any = null;
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: true } }));
  await page.route("**/api/ai/chat", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { answer: "Views are rising." } });
  });
  await loadDemo(page);
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await expect(dialog.getByLabel("AI answers on")).toBeVisible();
  await expect(dialog).not.toContainText(/google|gemma|gemini/i);
  await ask(page, "What changed?");
  await expect(dialog).toContainText("Views are rising.");
  await expect(dialog).toContainText("AI generated");
  expect(sent.message).toBe("What changed?");
  expect(sent.analysis.preview).toBeUndefined();
  expect(sent.analysis.post_references).toBeUndefined();
});

test("AI also answers before any data is loaded, with an empty summary", async ({ page }) => {
  let sent: any = null;
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: true } }));
  await page.route("**/api/ai/chat", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { answer: "Upload a file and I can explain it." } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = await ask(page, "What can you do?");
  await expect(dialog).toContainText("Upload a file and I can explain it.");
  expect(sent.analysis).toEqual({});
});

test("while AI is writing, a blinking notice offers a standard answer right away", async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: true } }));
  await page.route("**/api/ai/chat", async (route) => {
    await gate;
    await route.fulfill({ json: { answer: "Too late." } }).catch(() => {});
  });
  await loadDemo(page);
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = await ask(page, "Summarize totals");
  await expect(dialog.getByRole("status")).toContainText("The assistant is writing your answer");
  await dialog.getByRole("button", { name: "Standard answer" }).click();
  await expect(dialog).toContainText("678 sales");
  await expect(dialog).toContainText("Standard answer");
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await expect(dialog).not.toContainText("did not load");
  release();
  await expect(dialog).not.toContainText("Too late.");
});

test("a failed AI answer falls back to the standard answer", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: true } }));
  await page.route("**/api/ai/chat", (route) => route.fulfill({ status: 503, json: { detail: "down" } }));
  await loadDemo(page);
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = await ask(page, "Summarize totals");
  await expect(dialog).toContainText("standard answer instead");
});
