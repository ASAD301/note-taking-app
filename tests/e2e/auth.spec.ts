import { expect, test } from "@playwright/test";
import { createNote, PASSWORD, signIn, signUp, uniqueEmail } from "./helpers";

test("E2E-01: sign up, sign out, sign in", async ({ page }) => {
  const email = await signUp(page);
  await page.reload();
  await expect(page).toHaveURL(/\/notes$/);
  await expect(page.getByRole("heading", { name: "Your notes" })).toBeVisible();

  // AUTH-05: signed-in users are sent away from guest pages
  await page.goto("/login");
  await expect(page).toHaveURL(/\/notes$/);
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/notes$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/notes");
  await expect(page).toHaveURL(/\/login/);

  // AUTH-03: one generic error
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password.");
  await page.getByLabel("Email").fill(uniqueEmail("nobody"));
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password.");

  await signIn(page, email);
  await expect(page).toHaveURL(/\/notes$/);
  await page.reload();
  await expect(page).toHaveURL(/\/notes$/);
});

test("AUTH-01: email must be unique", async ({ page, browser }) => {
  const email = await signUp(page);
  const other = await (await browser.newContext()).newPage();
  await other.goto("/signup");
  await other.getByLabel("Name").fill("Dup");
  await other.getByLabel("Email").fill(email);
  await other.getByLabel("Password").fill(PASSWORD);
  await other.getByRole("button", { name: "Create account" }).click();
  await expect(other.getByRole("alert")).toBeVisible();
  await expect(other).toHaveURL(/\/signup/);
});

test("AUTH-02: password shorter than 8 is rejected", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Name").fill("Short");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/signup/);
});

test("E2E-02: /notes while signed out redirects to login and back", async ({ page }) => {
  const email = await signUp(page);
  const noteUrl = await createNote(page);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto(noteUrl);
  await expect(page).toHaveURL(/\/login\?next=/);
  await signIn(page, email);
  await expect(page).toHaveURL(noteUrl);
});
