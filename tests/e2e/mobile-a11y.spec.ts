import { expect, test } from "@playwright/test";
import { createNote, editorBox, expectNoSeriousA11yIssues, setTitle, share, signUp, waitSaved } from "./helpers";

test.describe("E2E-14: 360 px wide", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("main flows reachable without horizontal scroll", async ({ page }) => {
    const noHScroll = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);

    await signUp(page);
    await noHScroll();
    await createNote(page);
    await noHScroll();

    for (const name of [
      "Bold",
      "Italic",
      "Inline code",
      "Code block",
      "Bullet list",
      "Horizontal rule",
      "Undo",
      "Redo",
    ]) {
      const btn = page.getByRole("button", { name, exact: true });
      await btn.scrollIntoViewIfNeeded();
      await expect(btn).toBeInViewport();
    }
    await expect(page.getByLabel("Block type")).toBeInViewport();

    await setTitle(page, "Mobile note");
    await editorBox(page).click();
    await page.getByRole("button", { name: "Bold", exact: true }).click();
    await page.keyboard.type("tiny screen");
    await waitSaved(page);
    await noHScroll();

    const link = await share(page);
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Mobile note" })).toBeVisible();
    await noHScroll();
  });
});

test("NFR-05: no serious or critical axe issues on any page", async ({ page }) => {
  for (const path of ["/", "/login", "/signup", "/does-not-exist"]) {
    await page.goto(path);
    await expectNoSeriousA11yIssues(page);
  }

  await signUp(page);
  await expectNoSeriousA11yIssues(page); // empty state

  await createNote(page);
  await setTitle(page, "A11y note");
  await editorBox(page).click();
  await page.keyboard.type("```js ");
  await page.keyboard.type("const a = 1;");
  await waitSaved(page);
  await expectNoSeriousA11yIssues(page); // editor
  const link = await share(page);
  await page.getByRole("button", { name: "Shared" }).click();
  await expectNoSeriousA11yIssues(page); // share dialog open
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();

  await page.goto("/notes");
  await expectNoSeriousA11yIssues(page); // list

  await page.goto(link);
  await expectNoSeriousA11yIssues(page); // shared page
});
