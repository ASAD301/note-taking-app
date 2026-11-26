"use client";

import type { JSONContent } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { Placeholder } from "@tiptap/extensions";
import { memo, useEffect, useRef } from "react";
import { editorExtensions } from "@/lib/editor-extensions";
import { Toolbar } from "./Toolbar";

const extensions = [...editorExtensions, Placeholder.configure({ placeholder: "Start writing…" })];

const editorProps = {
  attributes: {
    class: "tiptap prose prose-neutral dark:prose-invert max-w-none py-4",
    "aria-label": "Note content",
    role: "textbox",
    "aria-multiline": "true",
  },
};

/**
 * Options are created once (deps = []) so parent re-renders (e.g. autosave status changes)
 * never call editor.setOptions() mid-keystroke, which would break markdown input rules.
 */
export const Editor = memo(function Editor({
  initialContent,
  onChange,
}: {
  initialContent: JSONContent;
  onChange: (content: JSONContent) => void;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      immediatelyRender: false,
      editorProps,
      onUpdate: ({ editor: e }) => onChangeRef.current(e.getJSON()), // EDIT-12: store JSON, never HTML
    },
    [],
  );

  if (!editor) return <div className="min-h-[50vh] py-4 text-neutral-500">Loading editor…</div>;

  return (
    <div>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
});
