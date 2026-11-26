import { expect, test } from "@playwright/test";
import { createNote, editorBox, signUp, waitSaved } from "./helpers";

test("E2E-04: every format survives a reload", async ({ page }) => {
  await signUp(page);
  const url = await createNote(page);
  const ed = editorBox(page);
  await ed.click();
  const kb = page.keyboard;

  await kb.type("# Heading one");
  await kb.press("Enter");
  await kb.type("## Heading two");
  await kb.press("Enter");
  await kb.type("### Heading three");
  await kb.press("Enter");

  await kb.type("**bold** *italic* `code` ");
  await kb.press("ControlOrMeta+b");
  await kb.type("kbold");
  await kb.press("ControlOrMeta+b");
  await kb.press("ControlOrMeta+i");
  await kb.type(" kitalic");
  await kb.press("ControlOrMeta+i");
  await kb.press("Enter");

  await kb.type("- item one");
  await kb.press("Enter");
  await kb.press("Tab");
  await kb.type("nested item");
  await kb.press("Enter");
  await kb.press("Enter");
  await kb.press("Enter");

  await kb.type("---");
  await kb.type("### temp heading");
  await kb.press("ControlOrMeta+Alt+0"); // EDIT-04: back to normal text
  await kb.press("Enter");

  await kb.type("```javascript ");
  await kb.type("const answer = 42;");

  // EDIT-09: toolbar reflects the selection
  await expect(page.getByRole("button", { name: "Code block" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Code language")).toHaveValue("javascript");
  await waitSaved(page);

  await page.goto(url);
  await expect(ed.locator("h1")).toHaveText("Heading one");
  await expect(ed.locator("h2")).toHaveText("Heading two");
  await expect(ed.locator("h3")).toHaveCount(1);
  await expect(ed.locator("h3")).toHaveText("Heading three");
  await expect(ed.locator("strong", { hasText: /^bold$/ })).toHaveCount(1);
  await expect(ed.locator("strong", { hasText: "kbold" })).toHaveCount(1);
  await expect(ed.locator("em", { hasText: /^italic$/ })).toHaveCount(1);
  await expect(ed.locator("em", { hasText: "kitalic" })).toHaveCount(1);
  await expect(ed.locator("p code", { hasText: /^code$/ })).toHaveCount(1);
  await expect(ed.locator("ul > li > ul > li", { hasText: "nested item" })).toHaveCount(1);
  await expect(ed.locator("hr")).toHaveCount(1);
  await expect(ed.locator("p", { hasText: "temp heading" })).toHaveCount(1);
  await expect(ed.locator("pre code")).toContainText("const answer = 42;");
  await expect(ed.locator("pre code .hljs-keyword").first()).toBeVisible();

  // Toolbar active state follows the cursor
  await ed.locator("strong", { hasText: "kbold" }).click();
  await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "true");
  await ed.locator("h2").click();
  await expect(page.getByLabel("Block type")).toHaveValue("h2");
  await expect(page.getByRole("button", { name: "Bold" })).toHaveAttribute("aria-pressed", "false");
});

test("EDIT-10: undo and redo", async ({ page }) => {
  await signUp(page);
  await createNote(page);
  const ed = editorBox(page);
  await ed.click();
  await page.keyboard.type("hello");
  await page.waitForTimeout(600); // let history group close
  await page.keyboard.type(" world");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(ed).toHaveText("hello");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(ed).toHaveText("hello world");
});

test("E2E-05: pasting a link and an image keeps only plain text", async ({ page }) => {
  await signUp(page);
  const url = await createNote(page);
  const ed = editorBox(page);
  await ed.click();
  await ed.evaluate((el) => {
    const dt = new DataTransfer();
    dt.setData(
      "text/html",
      '<p>Visit <a href="https://example.com">example link</a> <img src="https://example.com/x.png" alt="pic"> <s>struck</s> done</p><ol><li>ordered</li></ol><table><tr><td>cell</td></tr></table>',
    );
    dt.setData("text/plain", "Visit example link struck done ordered cell");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await expect(ed).toContainText("example link");
  await expect(ed).toContainText("struck");
  await expect(ed).toContainText("ordered");
  await expect(ed).toContainText("cell");
  for (const tag of ["a", "img", "s", "ol", "table"]) await expect(ed.locator(tag)).toHaveCount(0);
  await waitSaved(page);

  await page.goto(url);
  await expect(ed).toContainText("example link");
  for (const tag of ["a", "img", "s", "ol", "table"]) await expect(ed.locator(tag)).toHaveCount(0);
});
