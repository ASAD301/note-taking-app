"use client";

import { useId, useRef, useState } from "react";
import { deleteNote } from "@/app/notes/actions";
import { ui } from "@/lib/ui";

export function DeleteNoteButton({ noteId, beforeDelete }: { noteId: string; beforeDelete?: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setPending(true);
    setError(null);
    beforeDelete?.();
    try {
      const res = await deleteNote(noteId); // redirects to /notes on success
      if (res && !res.ok) setError(res.error);
    } catch (e) {
      // redirect() surfaces as a navigation, not an error; anything else is a real failure
      if (!(e instanceof Error && e.message.includes("NEXT_REDIRECT"))) setError("Could not delete the note.");
    }
    setPending(false);
  }

  return (
    <>
      <button type="button" className={ui.secondaryButton} onClick={() => dialogRef.current?.showModal()}>
        Delete
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg bg-background p-6 text-foreground shadow-xl backdrop:bg-black/50"
      >
        <h2 id={titleId} className="mb-2 text-lg font-bold">
          Delete this note?
        </h2>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          This permanently deletes the note and turns off its public link. This cannot be undone.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={ui.secondaryButton} onClick={() => dialogRef.current?.close()}>
            Cancel
          </button>
          <button type="button" className={ui.dangerButton} disabled={pending} onClick={confirmDelete}>
            Delete note
          </button>
        </div>
      </dialog>
    </>
  );
}
