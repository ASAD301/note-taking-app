import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createNotesRepo, generateShareToken, type NotesRepo } from "@/lib/db/notes";
import { insertUser, tempDb } from "./helpers";

let db: Database;
let cleanup: () => void;
let repo: NotesRepo;
let alice: string;
let bob: string;

const doc = (text: string) =>
  JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

beforeEach(() => {
  ({ db, cleanup } = tempDb());
  repo = createNotesRepo(db);
  alice = insertUser(db, "alice");
  bob = insertUser(db, "bob");
});
afterEach(() => cleanup());

describe("repository", () => {
  test("create returns an Untitled empty note", () => {
    const n = repo.createNote(alice);
    expect(n.title).toBe("Untitled");
    expect(n.content).toEqual({ type: "doc", content: [] });
    expect(n.isPublic).toBe(false);
    expect(n.publicSlug).toBeNull();
    expect(n.createdAt).toBe(n.updatedAt);
  });

  test("list shows only own notes, newest updated first", () => {
    const a = repo.createNote(alice);
    const b = repo.createNote(alice);
    repo.createNote(bob);
    repo.updateNote(alice, a.id, { title: "edited" });
    const list = repo.listNotes(alice);
    expect(list.map((n) => n.id)).toEqual([a.id, b.id]);
    expect(list[0]?.title).toBe("edited");
  });

  test("get and update round-trip title and content", () => {
    const n = repo.createNote(alice);
    const res = repo.updateNote(alice, n.id, { title: "  Hello  ", contentJson: doc("hi") });
    expect(res?.updatedAt).toBeGreaterThan(n.updatedAt);
    const got = repo.getNote(alice, n.id);
    expect(got?.title).toBe("Hello");
    expect(got?.content).toEqual(JSON.parse(doc("hi")));
  });

  test("empty title saves as Untitled; long titles are cut to 200", () => {
    const n = repo.createNote(alice);
    repo.updateNote(alice, n.id, { title: "   " });
    expect(repo.getNote(alice, n.id)?.title).toBe("Untitled");
    repo.updateNote(alice, n.id, { title: "x".repeat(300) });
    expect(repo.getNote(alice, n.id)?.title.length).toBe(200);
  });

  test("delete removes the note and ends sharing", () => {
    const n = repo.createNote(alice);
    const slug = repo.shareNote(alice, n.id)!;
    expect(repo.deleteNote(alice, n.id)).toBe(true);
    expect(repo.getNote(alice, n.id)).toBeNull();
    expect(repo.getSharedNote(slug)).toBeNull();
    expect(repo.deleteNote(alice, n.id)).toBe(false);
  });
});

describe("ownership (SEC-01, SEC-03)", () => {
  test("every function returns nothing for another user's note", () => {
    const n = repo.createNote(alice);
    expect(repo.getNote(bob, n.id)).toBeNull();
    expect(repo.updateNote(bob, n.id, { title: "hacked" })).toBeNull();
    expect(repo.updateNote(bob, n.id, {})).toBeNull();
    expect(repo.deleteNote(bob, n.id)).toBe(false);
    expect(repo.shareNote(bob, n.id)).toBeNull();
    expect(repo.unshareNote(bob, n.id)).toBe(false);
    expect(repo.listNotes(bob)).toEqual([]);
    const still = repo.getNote(alice, n.id);
    expect(still?.title).toBe("Untitled");
    expect(still?.isPublic).toBe(false);
  });

  test("missing note behaves the same as a foreign note", () => {
    const id = crypto.randomUUID();
    expect(repo.getNote(alice, id)).toBeNull();
    expect(repo.updateNote(alice, id, { title: "x" })).toBeNull();
    expect(repo.deleteNote(alice, id)).toBe(false);
  });
});

describe("sharing", () => {
  test("token is 128-bit base64url and new each time; old token stops resolving", () => {
    const n = repo.createNote(alice);
    const first = repo.shareNote(alice, n.id)!;
    expect(first).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(repo.getSharedNote(first)?.title).toBe("Untitled");

    expect(repo.unshareNote(alice, n.id)).toBe(true);
    expect(repo.getSharedNote(first)).toBeNull();
    const row = repo.getNote(alice, n.id)!;
    expect(row.isPublic).toBe(false);
    expect(row.publicSlug).toBeNull();

    const second = repo.shareNote(alice, n.id)!;
    expect(second).not.toBe(first);
    expect(repo.getSharedNote(first)).toBeNull();
    expect(repo.getSharedNote(second)).not.toBeNull();

    const third = repo.shareNote(alice, n.id)!; // re-sharing while shared also rotates
    expect(repo.getSharedNote(second)).toBeNull();
    expect(repo.getSharedNote(third)).not.toBeNull();
  });

  test("share toggles do not change updated_at", () => {
    const n = repo.createNote(alice);
    repo.shareNote(alice, n.id);
    repo.unshareNote(alice, n.id);
    expect(repo.getNote(alice, n.id)?.updatedAt).toBe(n.updatedAt);
  });

  test("shared note exposes only title, content and updatedAt", () => {
    const n = repo.createNote(alice);
    repo.updateNote(alice, n.id, { contentJson: doc("public") });
    const slug = repo.shareNote(alice, n.id)!;
    expect(Object.keys(repo.getSharedNote(slug)!).sort()).toEqual(["content", "title", "updatedAt"]);
  });

  test("tokens are unique across many generations", () => {
    const set = new Set(Array.from({ length: 1000 }, generateShareToken));
    expect(set.size).toBe(1000);
  });
});

describe("schema", () => {
  test("deleting a user cascades to their notes", () => {
    repo.createNote(alice);
    repo.createNote(alice);
    db.query(`DELETE FROM "user" WHERE id = ?`).run(alice);
    expect((db.query("SELECT COUNT(*) AS c FROM notes").get() as { c: number }).c).toBe(0);
  });

  test("notes require an existing user", () => {
    expect(() => repo.createNote("nobody")).toThrow();
  });

  test("is_public must be 0 or 1", () => {
    const n = repo.createNote(alice);
    expect(() => db.query("UPDATE notes SET is_public = 2 WHERE id = ?").run(n.id)).toThrow();
  });
});
