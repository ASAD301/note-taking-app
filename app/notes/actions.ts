"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkContent } from "@/lib/content-check";
import { MAX_TITLE_LENGTH, notesRepo } from "@/lib/db/notes";

type Fail = { ok: false; error: string };
const NOT_FOUND: Fail = { ok: false, error: "Note not found." };
const NOT_SIGNED_IN: Fail = { ok: false, error: "You are signed out. Sign in again to save." };

const idSchema = z.uuid();
const patchSchema = z
  .object({
    title: z.string().max(MAX_TITLE_LENGTH, `Title must be at most ${MAX_TITLE_LENGTH} characters.`).optional(),
    content: z.string().optional(), // TipTap JSON, serialized by the client
  })
  .strict();

async function currentUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export async function createNote(): Promise<void> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const note = notesRepo().createNote(userId);
  revalidatePath("/notes");
  redirect(`/notes/${note.id}`);
}

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string },
): Promise<{ ok: true; updatedAt: number } | Fail> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  if (!idSchema.safeParse(id).success) return NOT_FOUND;
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  let contentJson: string | undefined;
  if (parsed.data.content !== undefined) {
    const check = checkContent(parsed.data.content);
    if (!check.ok) return { ok: false, error: check.error };
    contentJson = check.json;
  }
  const result = notesRepo().updateNote(userId, id, { title: parsed.data.title, contentJson });
  if (!result) return NOT_FOUND;
  return { ok: true, updatedAt: result.updatedAt };
}

export async function deleteNote(id: string): Promise<Fail> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  if (!idSchema.safeParse(id).success || !notesRepo().deleteNote(userId, id)) return NOT_FOUND;
  revalidatePath("/notes");
  redirect("/notes");
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
  return process.env.BETTER_AUTH_URL ?? "";
}

export async function shareNote(id: string): Promise<{ ok: true; url: string } | Fail> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  if (!idSchema.safeParse(id).success) return NOT_FOUND;
  const slug = notesRepo().shareNote(userId, id);
  if (!slug) return NOT_FOUND;
  revalidatePath("/notes");
  return { ok: true, url: `${await origin()}/share/${slug}` };
}

export async function unshareNote(id: string): Promise<{ ok: true } | Fail> {
  const userId = await currentUserId();
  if (!userId) return NOT_SIGNED_IN;
  if (!idSchema.safeParse(id).success || !notesRepo().unshareNote(userId, id)) return NOT_FOUND;
  revalidatePath("/notes");
  return { ok: true };
}
