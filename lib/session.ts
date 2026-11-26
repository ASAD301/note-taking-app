import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type User } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Real session check for pages (the proxy only checks the cookie exists). */
export async function requireUser(nextPath?: string): Promise<User> {
  const session = await getSession();
  if (!session) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return session.user;
}

/** Only allow same-site relative paths as post-login targets. */
export function safeNextPath(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/notes";
  return value;
}
