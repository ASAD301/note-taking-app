import type { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb } from "@/lib/db/client";
import { migrate } from "@/scripts/migrate";

/** Fresh migrated SQLite file in a temp dir. */
export function tempDb(): { db: Database; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "notes-test-"));
  const db = createDb(join(dir, "test.db"));
  migrate(db);
  return {
    db,
    cleanup: () => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Test-only: insert a row into better-auth's user table. */
export function insertUser(db: Database, id: string): string {
  const now = new Date().toISOString();
  db.query(`INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)`).run(
    id,
    id,
    `${id}@example.com`,
    now,
    now,
  );
  return id;
}
