import { test, expect } from "@playwright/test";

test("AI answers are hidden unless the server enables them", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("Use AI answers")).toHaveCount(0);
});

test("AI answers are opt-in, disclose what is sent and never send raw rows", async ({ page }) => {
  let sent: any = null;
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { status: "ok", storage: "none", ai: true } }),
  );
  await page.route("**/api/ai/chat", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { answer: "Views are rising." } });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const toggle = dialog.getByRole("checkbox", { name: "Use AI answers" });
  await expect(toggle).not.toBeChecked();
  await expect(dialog).toContainText("nothing leaves this app");

  // Off: the built-in answer is used and nothing is sent.
  await dialog.getByRole("textbox", { name: "Your question" }).fill("Summarize totals");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog).toContainText("views");
  expect(sent).toBeNull();

  // On: the disclosure appears and only a summary goes out.
  await toggle.check();
  await expect(dialog).toContainText("sent to Google");
  await dialog.getByRole("textbox", { name: "Your question" }).fill("What changed?");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog).toContainText("Views are rising.");
  expect(sent.message).toBe("What changed?");
  expect(sent.analysis.preview).toBeUndefined();
  expect(sent.analysis.post_references).toBeUndefined();
});

test("a failed AI answer falls back to the built-in answer", async ({ page }) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: { status: "ok", ai: true } }));
  await page.route("**/api/ai/chat", (route) => route.fulfill({ status: 503, json: { detail: "down" } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Try synthetic demo data" }).click();
  await expect(page.getByRole("region", { name: "Dataset summary" })).toContainText("42 rows", {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("checkbox", { name: "Use AI answers" }).check();
  await dialog.getByRole("textbox", { name: "Your question" }).fill("Summarize totals");
  await dialog.getByRole("button", { name: "Send", exact: true }).click();
  await expect(dialog).toContainText("built-in answer instead");
});
