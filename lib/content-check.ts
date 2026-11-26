import type { JSONContent } from "@tiptap/core";
import { ALLOWED_ATTRS, ALLOWED_MARKS, ALLOWED_NODES } from "@/lib/editor-extensions";

export const MAX_CONTENT_BYTES = 1024 * 1024; // NOTE-09: 1 MB of JSON
const MAX_DEPTH = 100;

export type ContentCheck = { ok: true; json: string; content: JSONContent } | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function checkNode(node: unknown, depth: number): string | null {
  if (depth > MAX_DEPTH) return "Content is nested too deeply.";
  if (!isRecord(node)) return "Invalid content structure.";
  const { type, content, marks, attrs, text } = node;
  if (typeof type !== "string" || !ALLOWED_NODES.has(type)) return `Unsupported content type: ${String(type)}`;

  for (const key of Object.keys(node)) {
    if (!["type", "content", "marks", "attrs", "text"].includes(key)) return `Unexpected field: ${key}`;
  }
  if (type === "text") {
    if (typeof text !== "string") return "Text node without text.";
  } else if (text !== undefined) {
    return "Only text nodes may have text.";
  }

  if (attrs !== undefined && attrs !== null) {
    if (!isRecord(attrs)) return "Invalid attributes.";
    const allowed = ALLOWED_ATTRS[type];
    for (const [k, v] of Object.entries(attrs)) {
      if (!allowed?.has(k)) return `Unsupported attribute: ${k}`;
      if (type === "heading" && !(v === 1 || v === 2 || v === 3)) return "Invalid heading level.";
      if (type === "codeBlock" && v !== null && (typeof v !== "string" || !/^[a-z0-9+#-]{1,30}$/i.test(v)))
        return "Invalid code language.";
    }
  }

  if (marks !== undefined) {
    if (!Array.isArray(marks)) return "Invalid marks.";
    for (const mark of marks) {
      if (!isRecord(mark) || typeof mark.type !== "string" || !ALLOWED_MARKS.has(mark.type))
        return `Unsupported format: ${isRecord(mark) ? String(mark.type) : "?"}`;
      if (mark.attrs !== undefined && mark.attrs !== null && (!isRecord(mark.attrs) || Object.keys(mark.attrs).length))
        return "Marks may not have attributes.";
    }
  }

  if (content !== undefined) {
    if (!Array.isArray(content)) return "Invalid content list.";
    for (const child of content) {
      const err = checkNode(child, depth + 1);
      if (err) return err;
    }
  }
  return null;
}

/** Validate TipTap JSON (object or string) against the allowed schema and size cap (SEC-06, NOTE-09). */
export function checkContent(input: unknown): ContentCheck {
  let json: string;
  let parsed: unknown;
  try {
    if (typeof input === "string") {
      json = input;
      parsed = JSON.parse(input);
    } else {
      json = JSON.stringify(input);
      parsed = JSON.parse(json);
    }
  } catch {
    return { ok: false, error: "Content is not valid JSON." };
  }
  if (new TextEncoder().encode(json).length > MAX_CONTENT_BYTES)
    return { ok: false, error: "This note is too large to save (limit is 1 MB)." };
  if (!isRecord(parsed) || parsed.type !== "doc") return { ok: false, error: "Content must be a document." };
  const err = checkNode(parsed, 0);
  if (err) return { ok: false, error: err };
  return { ok: true, json: JSON.stringify(parsed), content: parsed as JSONContent };
}
