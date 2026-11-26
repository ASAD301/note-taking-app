import type { Database } from "bun:sqlite";
import type { JSONContent } from "@tiptap/core";
import { getDb } from "@/lib/db/client";

// All notes SQL lives here (SPEC 2). Every owner-scoped query filters by user_id (SEC-01)
// and uses bound parameters only (SEC-02).

export type Note = {
  id: string;
  userId: string;
  title: string;
  content: JSONContent;
  isPublic: boolean;
  publicSlug: string | null;
  createdAt: number;
  updatedAt: number;
};

export type NoteSummary = Pick<Note, "id" | "title" | "isPublic" | "updatedAt">;
export type SharedNote = Pick<Note, "title" | "content" | "updatedAt">;

type NoteRow = {
  id: string;
  user_id: string;
  title: string;
  content_json: string;
  is_public: number;
  public_slug: string | null;
  created_at: number;
  updated_at: number;
};

export const DEFAULT_TITLE = "Untitled";
export const MAX_TITLE_LENGTH = 200;
const EMPTY_DOC = '{"type":"doc","content":[]}';

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: JSON.parse(row.content_json) as JSONContent,
    isPublic: row.is_public === 1,
    publicSlug: row.public_slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeTitle(title: string): string {
  const t = title.trim().slice(0, MAX_TITLE_LENGTH);
  return t.length ? t : DEFAULT_TITLE;
}

/** 16 random bytes, base64url — 128 bits, never derived from the note id (SEC-05). */
export function generateShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Buffer.from(bytes).toString("base64url");
}

export function createNotesRepo(db: Database) {
  const q = {
    list: db.query<Omit<NoteRow, "user_id" | "content_json" | "public_slug" | "created_at">, [string]>(
      "SELECT id, title, is_public, updated_at FROM notes WHERE user_id = ? ORDER BY updated_at DESC",
    ),
    get: db.query<NoteRow, [string, string]>("SELECT * FROM notes WHERE id = ? AND user_id = ?"),
    insert: db.query<NoteRow, [string, string, string, string, number, number]>(
      `INSERT INTO notes (id, user_id, title, content_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    ),
    updateTitle: db.query<{ updated_at: number }, [string, number, string, string]>(
      "UPDATE notes SET title = ?, updated_at = ? WHERE id = ? AND user_id = ? RETURNING updated_at",
    ),
    updateContent: db.query<{ updated_at: number }, [string, number, string, string]>(
      "UPDATE notes SET content_json = ?, updated_at = ? WHERE id = ? AND user_id = ? RETURNING updated_at",
    ),
    updateBoth: db.query<{ updated_at: number }, [string, string, number, string, string]>(
      "UPDATE notes SET title = ?, content_json = ?, updated_at = ? WHERE id = ? AND user_id = ? RETURNING updated_at",
    ),
    remove: db.query<{ id: string }, [string, string]>("DELETE FROM notes WHERE id = ? AND user_id = ? RETURNING id"),
    share: db.query<{ public_slug: string }, [string, string, string]>(
      "UPDATE notes SET is_public = 1, public_slug = ? WHERE id = ? AND user_id = ? RETURNING public_slug",
    ),
    unshare: db.query<{ id: string }, [string, string]>(
      "UPDATE notes SET is_public = 0, public_slug = NULL WHERE id = ? AND user_id = ? RETURNING id",
    ),
    shared: db.query<Pick<NoteRow, "title" | "content_json" | "updated_at">, [string]>(
      "SELECT title, content_json, updated_at FROM notes WHERE public_slug = ? AND is_public = 1",
    ),
  };

  // Strictly increasing per-process timestamps keep "last updated" ordering stable for rapid edits.
  let lastTs = 0;
  const now = () => (lastTs = Math.max(Date.now(), lastTs + 1));

  return {
    listNotes(userId: string): NoteSummary[] {
      return q.list.all(userId).map((r) => ({
        id: r.id,
        title: r.title,
        isPublic: r.is_public === 1,
        updatedAt: r.updated_at,
      }));
    },

    getNote(userId: string, id: string): Note | null {
      const row = q.get.get(id, userId);
      return row ? toNote(row) : null;
    },

    createNote(userId: string): Note {
      const ts = now();
      const row = q.insert.get(crypto.randomUUID(), userId, DEFAULT_TITLE, EMPTY_DOC, ts, ts);
      if (!row) throw new Error("Insert failed");
      return toNote(row);
    },

    /** `contentJson` must already have passed checkContent(). Returns null if not found. */
    updateNote(
      userId: string,
      id: string,
      patch: { title?: string; contentJson?: string },
    ): { updatedAt: number } | null {
      const ts = now();
      const title = patch.title === undefined ? undefined : normalizeTitle(patch.title);
      let row: { updated_at: number } | null;
      if (title !== undefined && patch.contentJson !== undefined) {
        row = q.updateBoth.get(title, patch.contentJson, ts, id, userId);
      } else if (title !== undefined) {
        row = q.updateTitle.get(title, ts, id, userId);
      } else if (patch.contentJson !== undefined) {
        row = q.updateContent.get(patch.contentJson, ts, id, userId);
      } else {
        const existing = q.get.get(id, userId);
        return existing ? { updatedAt: existing.updated_at } : null;
      }
      return row ? { updatedAt: row.updated_at } : null;
    },

    deleteNote(userId: string, id: string): boolean {
      return q.remove.get(id, userId) !== null;
    },

    /** Turns sharing on with a brand-new token every time (SHARE-04). Does not touch updated_at. */
    shareNote(userId: string, id: string): string | null {
      return q.share.get(generateShareToken(), id, userId)?.public_slug ?? null;
    },

    unshareNote(userId: string, id: string): boolean {
      return q.unshare.get(id, userId) !== null;
    },

    /** Public lookup by token; selects only what the share page shows (SEC-04). */
    getSharedNote(slug: string): SharedNote | null {
      const row = q.shared.get(slug);
      return row
        ? { title: row.title, content: JSON.parse(row.content_json) as JSONContent, updatedAt: row.updated_at }
        : null;
    },
  };
}

export type NotesRepo = ReturnType<typeof createNotesRepo>;

const globalForRepo = globalThis as unknown as { __notesRepo?: NotesRepo };

/** Repository bound to the app database. */
export function notesRepo(): NotesRepo {
  globalForRepo.__notesRepo ??= createNotesRepo(getDb());
  return globalForRepo.__notesRepo;
}
