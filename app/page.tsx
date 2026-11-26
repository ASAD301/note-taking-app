import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ui } from "@/lib/ui";

export default async function LandingPage() {
  if (await getSession()) redirect("/notes");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Notes</h1>
      <p className="text-lg text-neutral-700 dark:text-neutral-300">
        Write rich-text notes, keep them private, and share any note with a read-only link you can turn off at any time.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/signup" className={ui.primaryButton}>
          Create an account
        </Link>
        <Link href="/login" className={ui.secondaryButton}>
          Sign in
        </Link>
      </div>
    </main>
  );
}
