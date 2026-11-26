import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_DB_PATH = "./data/app.db";

/** Open a SQLite database with the pragmas the app relies on. */
export function createDb(path: string = process.env.DATABASE_PATH ?? DEFAULT_DB_PATH): Database {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true, strict: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  return db;
}

const globalForDb = globalThis as unknown as { __noteDb?: Database };

/** Shared app connection, opened on first use and cached across dev hot reloads. */
export function getDb(): Database {
  globalForDb.__noteDb ??= createDb();
  return globalForDb.__noteDb;
}
