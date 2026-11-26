import { type Browser, type Page, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

let counter = 0;
export const PASSWORD = "correct-horse-1";

export function uniqueEmail(prefix = "user"): string {
  return `${prefix}-${Date.now()}-${process.pid}-${counter++}@example.com`;
}

export async function signUp(page: Page, email = uniqueEmail()): Promise<string> {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Test User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/notes$/);
  return email;
}

export async function signIn(page: Page, email: string): Promise<void> {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function newUserPage(browser: Browser): Promise<Page> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signUp(page);
  return page;
}

export function editorBox(page: Page) {
  return page.getByRole("textbox", { name: "Note content" });
}

export function status(page: Page) {
  return page.getByRole("status");
}

/** Create a note from the list page; returns its URL. */
export async function createNote(page: Page): Promise<string> {
  await page.goto("/notes");
  const btn = page.getByRole("button", { name: /^(New note|Create your first note)$/ });
  await btn.click();
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}$/);
  await expect(editorBox(page)).toBeVisible();
  return page.url();
}

export async function setTitle(page: Page, title: string) {
  const input = page.getByLabel("Title");
  await input.fill(title);
}

export async function waitSaved(page: Page) {
  await expect(status(page)).toHaveText("Saved", { timeout: 10_000 });
}

/** Turn on sharing from the editor page; returns the public URL. */
export async function share(page: Page): Promise<string> {
  await page.getByRole("button", { name: /^(Share|Shared)$/ }).click();
  const dialog = page.getByRole("dialog", { name: "Share note" });
  await dialog.getByRole("button", { name: "Create public link" }).click();
  const link = dialog.getByLabel("Public link");
  await expect(link).toHaveValue(/\/share\/[A-Za-z0-9_-]{22}$/);
  const url = await link.inputValue();
  await dialog.getByRole("button", { name: "Close" }).click();
  return url;
}

export async function unshare(page: Page) {
  await page.getByRole("button", { name: /^(Share|Shared)$/ }).click();
  const dialog = page.getByRole("dialog", { name: "Share note" });
  await dialog.getByRole("button", { name: "Stop sharing" }).click();
  await expect(dialog.getByRole("button", { name: "Create public link" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
}

export async function expectNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`)).toEqual([]);
}
