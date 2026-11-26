import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NoteEditor } from "@/components/NoteEditor";
import { notesRepo } from "@/lib/db/notes";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Edit note" };

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/notes/${id}`);
  const note = notesRepo().getNote(user.id, id);
  if (!note) notFound(); // SEC-03: missing and foreign notes look the same

  return (
    <NoteEditor
      key={note.id}
      noteId={note.id}
      initialTitle={note.title}
      initialContent={note.content}
      publicSlug={note.publicSlug}
    />
  );
}
