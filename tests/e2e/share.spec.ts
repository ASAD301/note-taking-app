import { expect, test, type Browser } from "@playwright/test";
import { createNote, editorBox, newUserPage, setTitle, share, unshare, waitSaved } from "./helpers";

async function anonPage(browser: Browser) {
  return (await browser.newContext()).newPage();
}

test("E2E-08: shared link shows a read-only page to signed-out visitors", async ({ browser }) => {
  const owner = await newUserPage(browser);
  await createNote(owner);
  await setTitle(owner, "Public recipe");
  await editorBox(owner).click();
  await owner.keyboard.type("## Ingredients");
  await owner.keyboard.press("Enter");
  await owner.keyboard.type("**flour** and `water`");
  await waitSaved(owner);
  const link = await share(owner);

  const anon = await anonPage(browser);
  const res = await anon.goto(link);
  expect(res?.status()).toBe(200);
  await expect(anon.getByRole("heading", { level: 1, name: "Public recipe" })).toBeVisible();
  await expect(anon.getByRole("heading", { level: 2, name: "Ingredients" })).toBeVisible();
  await expect(anon.locator("strong", { hasText: "flour" })).toBeVisible();
  await expect(anon.getByText(/Last updated/)).toBeVisible();
  await expect(anon.locator("[contenteditable]")).toHaveCount(0);
  await expect(anon.getByText("@example.com")).toHaveCount(0);
  // SHARE-06
  await expect(anon.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

  // "Shared" badge in the owner's list (NOTE-02)
  await owner.goto("/notes");
  await expect(owner.getByRole("link", { name: /Public recipe/ }).getByText("Shared")).toBeVisible();
});

test("E2E-09 / E2E-10: stop sharing, then share again with a new link", async ({ browser }) => {
  const owner = await newUserPage(browser);
  await createNote(owner);
  await setTitle(owner, "Rotating");
  await waitSaved(owner);
  const first = await share(owner);
  const anon = await anonPage(browser);
  expect((await anon.goto(first))?.status()).toBe(200);

  await unshare(owner);
  expect((await anon.goto(first))?.status()).toBe(404);

  const second = await share(owner);
  expect(second).not.toBe(first);
  expect((await anon.goto(second))?.status()).toBe(200);
  await expect(anon.getByRole("heading", { name: "Rotating" })).toBeVisible();
  expect((await anon.goto(first))?.status()).toBe(404);

  // SHARE-07: unknown token gives the same 404
  expect((await anon.goto("/share/AAAAAAAAAAAAAAAAAAAAAA"))?.status()).toBe(404);
  expect((await anon.goto("/share/x"))?.status()).toBe(404);
});

test("E2E-11: edits show on the shared page on next load", async ({ browser }) => {
  const owner = await newUserPage(browser);
  await createNote(owner);
  await editorBox(owner).click();
  await owner.keyboard.type("version one");
  await waitSaved(owner);
  const link = await share(owner);

  const anon = await anonPage(browser);
  await anon.goto(link);
  await expect(anon.getByText("version one")).toBeVisible();

  await editorBox(owner).click();
  await owner.keyboard.press("ControlOrMeta+a");
  await owner.keyboard.type("version two");
  await waitSaved(owner);

  await anon.reload();
  await expect(anon.getByText("version two")).toBeVisible();
  await expect(anon.getByText("version one")).toHaveCount(0);
});

test("E2E-12: deleting a shared note kills its link", async ({ browser }) => {
  const owner = await newUserPage(browser);
  await createNote(owner);
  const link = await share(owner);
  const anon = await anonPage(browser);
  expect((await anon.goto(link))?.status()).toBe(200);

  await owner.getByRole("button", { name: "Delete" }).click();
  await owner.getByRole("dialog", { name: "Delete this note?" }).getByRole("button", { name: "Delete note" }).click();
  await expect(owner).toHaveURL(/\/notes$/);
  expect((await anon.goto(link))?.status()).toBe(404);
});
