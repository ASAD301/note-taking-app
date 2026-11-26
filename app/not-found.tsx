import Link from "next/link";
import { ui } from "@/lib/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-neutral-700 dark:text-neutral-300">This page does not exist or is no longer available.</p>
      <Link href="/" className={ui.link}>
        Go home
      </Link>
    </main>
  );
}
