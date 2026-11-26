import type { JSONContent } from "@tiptap/core";
import { describe, expect, test } from "bun:test";
import { checkContent, MAX_CONTENT_BYTES } from "@/lib/content-check";
import { renderNoteHtml } from "@/lib/render-note";

const p = (...content: unknown[]) => ({ type: "paragraph", content });
const t = (text: string, marks?: unknown[]) => (marks ? { type: "text", text, marks } : { type: "text", text });
const doc = (...content: unknown[]) => ({ type: "doc", content }) as JSONContent;

const everyFormat = doc(
  { type: "heading", attrs: { level: 1 }, content: [t("H1")] },
  { type: "heading", attrs: { level: 2 }, content: [t("H2")] },
  { type: "heading", attrs: { level: 3 }, content: [t("H3")] },
  p(t("bold", [{ type: "bold" }]), t(" "), t("italic", [{ type: "italic" }]), t(" "), t("code", [{ type: "code" }])),
  { type: "codeBlock", attrs: { language: "javascript" }, content: [t("const a = 1 < 2;")] },
  {
    type: "bulletList",
    content: [
      {
        type: "listItem",
        content: [p(t("one")), { type: "bulletList", content: [{ type: "listItem", content: [p(t("nested"))] }] }],
      },
    ],
  },
  { type: "horizontalRule" },
  p(t("a"), { type: "hardBreak" }, t("b")),
);

describe("checkContent (SEC-06, NOTE-09)", () => {
  test("accepts every allowed format", () => {
    const r = checkContent(everyFormat);
    expect(r.ok).toBe(true);
  });

  test("accepts an empty doc and a JSON string", () => {
    expect(checkContent(doc()).ok).toBe(true);
    expect(checkContent(JSON.stringify(everyFormat)).ok).toBe(true);
  });

  test("rejects invalid JSON", () => {
    expect(checkContent("{not json").ok).toBe(false);
  });

  test("rejects a non-doc root", () => {
    expect(checkContent(p(t("x"))).ok).toBe(false);
    expect(checkContent([]).ok).toBe(false);
    expect(checkContent(null).ok).toBe(false);
  });

  test.each([
    ["image", { type: "image", attrs: { src: "x.png" } }],
    ["orderedList", { type: "orderedList", content: [] }],
    ["table", { type: "table", content: [] }],
    ["blockquote", { type: "blockquote", content: [] }],
  ])("rejects unknown node type %s", (_name, node) => {
    expect(checkContent(doc(node)).ok).toBe(false);
  });

  test.each(["link", "strike", "underline"])("rejects unknown mark %s", (mark) => {
    expect(checkContent(doc(p(t("x", [{ type: mark, attrs: { href: "javascript:alert(1)" } }])))).ok).toBe(false);
  });

  test("rejects unknown attributes and bad values", () => {
    expect(checkContent(doc({ type: "paragraph", attrs: { style: "x" } })).ok).toBe(false);
    expect(checkContent(doc({ type: "heading", attrs: { level: 4 }, content: [t("x")] })).ok).toBe(false);
    expect(checkContent(doc({ type: "codeBlock", attrs: { language: '"><script>' } })).ok).toBe(false);
    expect(checkContent(doc({ type: "paragraph", html: "<b>x</b>" })).ok).toBe(false);
  });

  test("rejects content over 1 MB", () => {
    const big = doc(p(t("x".repeat(MAX_CONTENT_BYTES))));
    const r = checkContent(big);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("1 MB");
  });

  test("rejects deeply nested content", () => {
    let node: Record<string, unknown> = p(t("deep"));
    for (let i = 0; i < 150; i++) node = { type: "bulletList", content: [{ type: "listItem", content: [node] }] };
    expect(checkContent(doc(node)).ok).toBe(false);
  });
});

describe("renderNoteHtml (SEC-07)", () => {
  test("renders every format and escapes text", () => {
    const html = renderNoteHtml(everyFormat);
    for (const tag of ["<h1>", "<h2>", "<h3>", "<strong>", "<em>", "<code>", "<pre>", "<ul>", "<hr>"]) {
      expect(html).toContain(tag);
    }
    expect(html).toContain("language-javascript");
    expect(html).toContain("hljs-keyword");
    expect(html).toContain("&lt;");
    expect(html).not.toContain("1 < 2");
  });

  test("never outputs raw HTML from text", () => {
    const html = renderNoteHtml(
      doc(p(t("<script>alert(1)</script>")), { type: "codeBlock", content: [t("<img onerror=x>")] }),
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
  });
});
