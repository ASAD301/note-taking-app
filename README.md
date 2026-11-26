# Notes

Rich-text notes with public, revocable share links. See [SPEC.MD](./SPEC.MD) for the full specification.

Stack: Next.js 16 (App Router) on **Bun**, SQLite via `bun:sqlite`, better-auth, TipTap, Tailwind.

## Setup

```bash
bun install
cp .env.example .env.local      # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
bun run migrate                 # creates ./data/app.db
bun run dev                     # http://localhost:3000
```

All scripts use `bun --bun` — `bun:sqlite` only exists when Next.js runs on the Bun runtime.

## Scripts

| Script                                        | What it does                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `bun run dev`                                 | Dev server                                                                                            |
| `bun run build` / `start`                     | Production build / server                                                                             |
| `bun run migrate`                             | Apply pending `db/migrations/*.sql`                                                                   |
| `bun run auth:generate`                       | Regenerate better-auth SQL after changing `lib/auth.ts` (save the output as a new numbered migration) |
| `bun run backup`                              | `VACUUM INTO` a timestamped copy in `$BACKUP_DIR` (default `./backups`)                               |
| `bun run test`                                | Unit tests (temp SQLite files)                                                                        |
| `bun run test:e2e`                            | Playwright against a fresh DB on port 3100 (`bunx playwright install chromium` first)                 |
| `bun run typecheck` / `lint` / `format:check` | Code quality                                                                                          |

## Deploy (Docker)

```bash
docker build -t notes .
docker run -d -p 3000:3000 -v notes-data:/data \
  -e BETTER_AUTH_SECRET=... -e BETTER_AUTH_URL=https://notes.example.com notes
```

Put it behind Caddy or Nginx for HTTPS. Migrations run on container start. Not suitable for serverless hosts (no persistent disk, no Bun runtime).

## Notes on Next.js 16

- Route protection lives in `proxy.ts` (Next 16 renamed `middleware.ts`). It only checks that a session cookie exists; every page and server action re-checks the session.
- Editor content is sent to server actions as a JSON **string**: ProseMirror attribute objects are not plain objects and React's action serializer would otherwise drop them.
