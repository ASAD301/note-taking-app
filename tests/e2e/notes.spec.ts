import { expect, test } from "@playwright/test";
import { createNote, editorBox, newUserPage, setTitle, signUp, status, waitSaved } from "./helpers";

test("NOTE-08: empty state", async ({ page }) => {
  await signUp(page);
  await expect(page.getByText("You don't have any notes yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create your first note" })).toBeVisible();
});

test("E2E-03: create a note, type, reload", async ({ page }) => {
  await signUp(page);
  const url = await createNote(page);
  await expect(page.getByLabel("Title")).toHaveValue("Untitled");

  await setTitle(page, "Shopping list");
  await editorBox(page).click();
  await page.keyboard.type("Milk and eggs");
  await expect(status(page)).toHaveText(/Unsaved changes|Saving…/);
  await waitSaved(page);

  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(page.getByLabel("Title")).toHaveValue("Shopping list");
  await expect(editorBox(page)).toContainText("Milk and eggs");
  await expect(status(page)).toHaveText("Saved");

  // NOTE-02: list shows it
  await page.goto("/notes");
  await expect(page.getByRole("link", { name: /Shopping list/ })).toBeVisible();
});

test("NOTE-04: empty title saves as Untitled", async ({ page }) => {
  await signUp(page);
  await createNote(page);
  await setTitle(page, "");
  await waitSaved(page);
  await page.reload();
  await expect(page.getByLabel("Title")).toHaveValue("Untitled");
});

test("NOTE-02: list sorted by last updated", async ({ page }) => {
  await signUp(page);
  const first = await createNote(page);
  await setTitle(page, "First");
  await waitSaved(page);
  await createNote(page);
  await setTitle(page, "Second");
  await waitSaved(page);
  await page.goto(first);
  await setTitle(page, "First edited");
  await waitSaved(page);
  await page.goto("/notes");
  const titles = await page.getByRole("listitem").allInnerTexts();
  expect(titles[0]).toContain("First edited");
  expect(titles[1]).toContain("Second");
});

test("E2E-06: delete a note", async ({ page }) => {
  await signUp(page);
  const url = await createNote(page);
  await setTitle(page, "Delete me");
  await waitSaved(page);

  await page.getByRole("button", { name: "Delete" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this note?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(url);

  await page.getByRole("button", { name: "Delete" }).click();
  await dialog.getByRole("button", { name: "Delete note" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByText("Delete me")).toHaveCount(0);

  const res = await page.goto(url);
  expect(res?.status()).toBe(404);
});

test("E2E-07: user B cannot open user A's note", async ({ browser }) => {
  const a = await newUserPage(browser);
  const url = await createNote(a);
  await setTitle(a, "Secret plans");
  await editorBox(a).click();
  await a.keyboard.type("top secret body");
  await waitSaved(a);

  const b = await newUserPage(browser);
  const res = await b.goto(url);
  expect(res?.status()).toBe(404);
  await expect(b.getByText("Secret plans")).toHaveCount(0);
  await expect(b.getByText("top secret body")).toHaveCount(0);

  // Same response as a note that does not exist (SEC-03)
  const missing = await b.goto(`/notes/${crypto.randomUUID()}`);
  expect(missing?.status()).toBe(404);
});

test("E2E-13: offline save fails, retry saves, nothing lost", async ({ page, context }) => {
  await signUp(page);
  const url = await createNote(page);
  await editorBox(page).click();
  await page.keyboard.type("before offline. ");
  await waitSaved(page);

  await context.setOffline(true);
  await page.keyboard.type("typed while offline");
  await expect(page.getByText("Save failed –")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await expect(editorBox(page)).toContainText("typed while offline");

  await context.setOffline(false);
  const retry = page.getByRole("button", { name: "Retry" });
  if (await retry.isVisible()) await retry.click().catch(() => {}); // may already have auto-retried on "online"
  await waitSaved(page);

  await page.goto(url);
  await expect(editorBox(page)).toContainText("before offline. typed while offline");
});
