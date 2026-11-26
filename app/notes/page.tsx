import type { Metadata } from "next";
import { NoteList } from "@/components/NoteList";
import { notesRepo } from "@/lib/db/notes";
import { requireUser } from "@/lib/session";
import { ui } from "@/lib/ui";
import { createNote } from "./actions";

export const metadata: Metadata = { title: "Your notes" };

export default async function NotesPage() {
  const user = await requireUser("/notes");
  const notes = notesRepo().listNotes(user.id);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Your notes</h1>
        {notes.length > 0 && (
          <form action={createNote}>
            <button type="submit" className={ui.primaryButton}>
              New note
            </button>
          </form>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-md border border-dashed border-neutral-300 p-8 dark:border-neutral-700">
          <p className="text-neutral-700 dark:text-neutral-300">You don&apos;t have any notes yet.</p>
          <form action={createNote}>
            <button type="submit" className={ui.primaryButton}>
              Create your first note
            </button>
          </form>
        </div>
      ) : (
        <NoteList notes={notes} />
      )}
    </main>
  );
}
