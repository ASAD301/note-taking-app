import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";

/**
 * Single source of the allowed formats (SPEC 3.3).
 * Used by the editor, the stored-JSON check (SEC-06) and the share-page renderer (SEC-07).
 */
export const lowlight = createLowlight(common);

export const CODE_LANGUAGES: readonly string[] = [
  "plaintext",
  ...lowlight
    .listLanguages()
    .filter((l) => l !== "plaintext")
    .sort(),
];

export const editorExtensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: false, // replaced by CodeBlockLowlight below
    blockquote: false,
    orderedList: false,
    strike: false,
    link: false,
    underline: false,
  }),
  CodeBlockLowlight.configure({ lowlight, defaultLanguage: "plaintext" }),
];

/** Node and mark types that may appear in stored JSON. */
export const ALLOWED_NODES: ReadonlySet<string> = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "listItem",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
]);

export const ALLOWED_MARKS: ReadonlySet<string> = new Set(["bold", "italic", "code"]);

/** Allowed attributes per node type; anything else is rejected. */
export const ALLOWED_ATTRS: Readonly<Record<string, ReadonlySet<string>>> = {
  heading: new Set(["level"]),
  codeBlock: new Set(["language"]),
};
