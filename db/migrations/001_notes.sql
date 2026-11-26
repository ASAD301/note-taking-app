CREATE TABLE IF NOT EXISTS notes (
  id           TEXT PRIMARY KEY,              -- crypto.randomUUID()
  user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title        TEXT NOT NULL DEFAULT 'Untitled',
  content_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
  is_public    INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1)),
  public_slug  TEXT UNIQUE,                   -- NULL when not shared
  created_at   INTEGER NOT NULL,              -- Unix ms
  updated_at   INTEGER NOT NULL               -- Unix ms
);

CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON notes (user_id, updated_at DESC);
