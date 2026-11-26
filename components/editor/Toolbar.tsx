"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import { CODE_LANGUAGES } from "@/lib/editor-extensions";
import { ui } from "@/lib/ui";

type BlockType = "paragraph" | "h1" | "h2" | "h3" | "other";

function ToolButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-medium hover:bg-neutral-200 disabled:opacity-40 dark:hover:bg-neutral-800 ${
        active
          ? "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          : ""
      } ${ui.focus}`}
    >
      {children}
    </button>
  );
}

const sep = <span aria-hidden className="mx-1 h-6 w-px bg-neutral-300 dark:bg-neutral-700" />;

export function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      let block: BlockType = "other";
      if (e.isActive("heading", { level: 1 })) block = "h1";
      else if (e.isActive("heading", { level: 2 })) block = "h2";
      else if (e.isActive("heading", { level: 3 })) block = "h3";
      else if (e.isActive("paragraph")) block = "paragraph";
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        code: e.isActive("code"),
        codeBlock: e.isActive("codeBlock"),
        bulletList: e.isActive("bulletList"),
        language: (e.getAttributes("codeBlock").language as string | null | undefined) ?? "plaintext",
        block,
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  const chain = () => editor.chain().focus();

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-background py-2 dark:border-neutral-800"
    >
      <label className="sr-only" htmlFor="block-type">
        Block type
      </label>
      <select
        id="block-type"
        value={s.block === "other" ? "" : s.block}
        onChange={(e) => {
          const v = e.target.value as BlockType;
          if (v === "paragraph") chain().setParagraph().run();
          else if (v === "h1" || v === "h2" || v === "h3")
            chain()
              .setHeading({ level: Number(v[1]) as 1 | 2 | 3 })
              .run();
        }}
        className={`h-9 rounded-md border border-neutral-300 bg-background px-2 text-sm dark:border-neutral-700 ${ui.focus}`}
      >
        {s.block === "other" && <option value="">—</option>}
        <option value="paragraph">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      {sep}
      <ToolButton label="Bold" shortcut="Ctrl/Cmd+B" active={s.bold} onClick={() => chain().toggleBold().run()}>
        <span className="font-bold">B</span>
      </ToolButton>
      <ToolButton label="Italic" shortcut="Ctrl/Cmd+I" active={s.italic} onClick={() => chain().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolButton>
      <ToolButton label="Inline code" shortcut="`text`" active={s.code} onClick={() => chain().toggleCode().run()}>
        <span className="font-mono">{"<>"}</span>
      </ToolButton>
      {sep}
      <ToolButton
        label="Code block"
        shortcut="```"
        active={s.codeBlock}
        onClick={() => chain().toggleCodeBlock().run()}
      >
        <span className="font-mono">{"{ }"}</span>
      </ToolButton>
      {s.codeBlock && (
        <>
          <label className="sr-only" htmlFor="code-language">
            Code language
          </label>
          <select
            id="code-language"
            value={s.language}
            onChange={(e) => chain().updateAttributes("codeBlock", { language: e.target.value }).run()}
            className={`h-9 max-w-36 rounded-md border border-neutral-300 bg-background px-2 text-sm dark:border-neutral-700 ${ui.focus}`}
          >
            {CODE_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </>
      )}
      <ToolButton
        label="Bullet list"
        shortcut="- "
        active={s.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        •≡
      </ToolButton>
      <ToolButton label="Horizontal rule" shortcut="---" onClick={() => chain().setHorizontalRule().run()}>
        ―
      </ToolButton>
      {sep}
      <ToolButton label="Undo" shortcut="Ctrl/Cmd+Z" disabled={!s.canUndo} onClick={() => chain().undo().run()}>
        ↶
      </ToolButton>
      <ToolButton label="Redo" shortcut="Ctrl/Cmd+Shift+Z" disabled={!s.canRedo} onClick={() => chain().redo().run()}>
        ↷
      </ToolButton>
    </div>
  );
}
