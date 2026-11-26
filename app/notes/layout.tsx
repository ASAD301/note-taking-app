import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { requireUser } from "@/lib/session";
import { ui } from "@/lib/ui";

export default async function NotesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/notes");
  return (
    <>
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/notes" className={`text-lg font-bold ${ui.focus}`}>
            Notes
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-600 sm:inline dark:text-neutral-400">{user.name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
