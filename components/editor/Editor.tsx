"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { editorExtensions } from "@/lib/editor-extensions";
import { Toolbar } from "./Toolbar";

export function Editor({
  initialContent,
  onChange,
}: {
  initialContent: JSONContent;
  onChange: (content: JSONContent) => void;
}) {
  const editor = useEditor({
    extensions: [...editorExtensions, Placeholder.configure({ placeholder: "Start writing…" })],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "tiptap prose prose-neutral dark:prose-invert max-w-none py-4",
        "aria-label": "Note content",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON()), // EDIT-12: store JSON, never HTML
  });

  if (!editor) return <div className="min-h-[50vh] py-4 text-neutral-500">Loading editor…</div>;

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
