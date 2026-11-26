import Link from "next/link";
import { LocalTime } from "@/components/LocalTime";
import type { NoteSummary } from "@/lib/db/notes";
import { ui } from "@/lib/ui";

export function NoteList({ notes }: { notes: NoteSummary[] }) {
  return (
    <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {notes.map((note) => (
        <li key={note.id}>
          <Link
            href={`/notes/${note.id}`}
            className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 ${ui.focus}`}
          >
            <span className="min-w-0 flex-1 truncate font-medium">{note.title}</span>
            <span className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              {note.isPublic && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-900 dark:bg-green-900 dark:text-green-100">
                  Shared
                </span>
              )}
              <LocalTime ts={note.updatedAt} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
