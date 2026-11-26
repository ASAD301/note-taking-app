import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LocalTime } from "@/components/LocalTime";
import { notesRepo } from "@/lib/db/notes";
import { renderNoteHtml } from "@/lib/render-note";

export const dynamic = "force-dynamic"; // SHARE-05: always show the latest version

// SHARE-06: never index shared notes
export const metadata: Metadata = {
  title: "Shared note",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SharedNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = /^[A-Za-z0-9_-]{16,64}$/.test(slug) ? notesRepo().getSharedNote(slug) : null;
  if (!note) notFound(); // SHARE-07: unknown and revoked tokens look the same

  const html = renderNoteHtml(note.content);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <article>
        <header className="mb-6 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <h1 className="text-3xl font-bold break-words">{note.title}</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <LocalTime ts={note.updatedAt} prefix="Last updated " />
          </p>
        </header>
        <div className="prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </main>
  );
}
