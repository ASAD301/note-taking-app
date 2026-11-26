"use client";

import type { JSONContent } from "@tiptap/core";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { DeleteNoteButton } from "@/components/DeleteNoteButton";
import { ShareDialog } from "@/components/ShareDialog";
import { Editor } from "@/components/editor/Editor";
import { type SaveStatus, useAutosave } from "@/components/editor/useAutosave";
import { ui } from "@/lib/ui";

const MAX_TITLE = 200;

function StatusText({ status, error, onRetry }: { status: SaveStatus; error: string | null; onRetry: () => void }) {
  return (
    <div role="status" aria-live="polite" className="text-sm text-neutral-600 dark:text-neutral-400">
      {status === "saving" && "Saving…"}
      {status === "saved" && "Saved"}
      {status === "unsaved" && "Unsaved changes"}
      {status === "error" && (
        <span className="text-red-700 dark:text-red-300">
          Save failed –{" "}
          <button type="button" onClick={onRetry} className={ui.link}>
            Retry
          </button>
          {error && <span className="ml-1">({error})</span>}
        </span>
      )}
    </div>
  );
}

export function NoteEditor({
  noteId,
  initialTitle,
  initialContent,
  publicSlug,
}: {
  noteId: string;
  initialTitle: string;
  initialContent: JSONContent;
  publicSlug: string | null;
}) {
  const router = useRouter();
  const titleId = useId();
  const [title, setTitle] = useState(initialTitle);
  const { status, error, queue, flush } = useAutosave(noteId);

  // NOTE-06 for in-app navigation: save first; if that fails, ask before leaving.
  async function goBack() {
    const ok = await flush();
    if (ok || window.confirm("Your latest changes could not be saved. Leave anyway?")) {
      router.push("/notes");
      router.refresh();
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={goBack} className={ui.link}>
          ← All notes
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <StatusText status={status} error={error} onRetry={() => void flush()} />
          <ShareDialog noteId={noteId} initialSlug={publicSlug} />
          <DeleteNoteButton noteId={noteId} />
        </div>
      </div>

      <label htmlFor={titleId} className="sr-only">
        Title
      </label>
      <input
        id={titleId}
        value={title}
        maxLength={MAX_TITLE}
        placeholder="Untitled"
        onChange={(e) => {
          setTitle(e.target.value);
          queue({ title: e.target.value });
        }}
        className={`w-full bg-transparent text-3xl font-bold outline-none placeholder:text-neutral-400 ${ui.focus}`}
      />

      <Editor initialContent={initialContent} onChange={(content) => queue({ content })} />
    </main>
  );
}
