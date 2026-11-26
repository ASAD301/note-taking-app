import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSession, safeNextPath } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const next = safeNextPath((await searchParams).next);
  if (await getSession()) redirect(next); // AUTH-05

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <AuthForm mode="login" next={next} />
    </main>
  );
}
