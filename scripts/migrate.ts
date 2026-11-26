import type { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createDb } from "../lib/db/client";

export const MIGRATIONS_DIR = join(import.meta.dir, "..", "db", "migrations");

/** Apply every not-yet-applied .sql file in filename order. Returns applied names. */
export function migrate(db: Database, dir: string = MIGRATIONS_DIR): string[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  );`);

  const done = new Set(
    db
      .query<{ name: string }, []>("SELECT name FROM schema_migrations")
      .all()
      .map((r) => r.name),
  );
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const record = db.prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)");
  const applied: string[] = [];
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = readFileSync(join(dir, file), "utf8");
    db.transaction(() => {
      db.exec(sql);
      record.run(file, Date.now());
    })();
    applied.push(file);
  }
  return applied;
}

if (import.meta.main) {
  const db = createDb();
  const applied = migrate(db);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
  db.close();
}
