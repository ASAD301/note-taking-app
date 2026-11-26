# Note-Taking App — Specification (v1)

## Table of contents

1. [Overview and scope](#1-overview-and-scope)
2. [Tech stack and runtime decisions](#2-tech-stack-and-runtime-decisions)
3. [Functional requirements](#3-functional-requirements)
4. [Data model and SQLite schema](#4-data-model-and-sqlite-schema)
5. [Routes, pages and server actions](#5-routes-pages-and-server-actions)
6. [Security and authorization](#6-security-and-authorization)
7. [Non-functional requirements](#7-non-functional-requirements)
8. [Project structure](#8-project-structure)
9. [Testing strategy and acceptance criteria](#9-testing-strategy-and-acceptance-criteria)
10. [Deployment and milestones](#10-deployment-and-milestones)

---

## 1. Overview and scope

The app lets authenticated users write rich-text notes, manage them, and share any note through a public read-only link they can revoke at any time.

### Goals for v1

- Email and password sign-up, sign-in and sign-out
- Create, view, update and delete own notes
- Rich text editing with a fixed set of formats (see [3.3](#33-rich-text-editor))
- Share a note publicly and stop sharing it

**In scope:** single-user ownership of notes, desktop and mobile web, light and dark mode.

**Out of scope for v1:** OAuth providers, email verification, password reset, collaboration or shared editing, folders, tags, full-text search, images or file attachments, note version history, offline mode.

> **Defaults assumed:** these follow the defaults proposed earlier; change any of them and the related sections should be updated.

---

## 2. Tech stack and runtime decisions

The app is a single Next.js App Router project that runs on the Bun runtime and stores everything in one SQLite file.

| Layer                       | Choice               | Notes                                                       |
| --------------------------- | -------------------- | ----------------------------------------------------------- |
| Framework                   | Next.js (App Router) | Server Components for reads, Server Actions for writes      |
| Runtime and package manager | Bun                  | Always start with `bun --bun next dev` / `bun --bun next start` |
| Language                    | TypeScript (strict)  | `strict: true`, no `any` in app code                        |
| Styling                     | TailwindCSS          | Typography plugin for rendered note content                 |
| Auth                        | better-auth          | Email and password provider, session cookies                |
| Editor                      | TipTap (React)       | StarterKit plus code block with lowlight                    |
| Database                    | SQLite via `bun:sqlite` | Raw SQL, prepared statements, WAL mode                   |
| Testing                     | `bun test` + Playwright | Unit tests for data layer, e2e for user flows            |

> **Runtime rule:** `bun:sqlite` only exists when Next.js runs on Bun. Without the `--bun` flag Next.js falls back to Node and imports of `bun:sqlite` fail. All package scripts must use the flag.

> **better-auth database:** better-auth shares the same SQLite file as the app. It talks to SQL databases through its built-in Kysely adapter, so the `bun:sqlite` `Database` instance from `lib/db/client.ts` is passed straight to `betterAuth({ database })`. Confirm during setup that the installed better-auth version accepts a `bun:sqlite` instance; if not, use a Kysely Bun SQLite dialect. The auth tables are generated with the better-auth CLI (see [4.1](#41-auth-tables-owned-by-better-auth)).

> **Data access:** all notes SQL lives in a small repository module (`lib/db/notes.ts`). Components and actions never write SQL directly.

---

## 3. Functional requirements

Each requirement has an ID so test cases and tickets can reference it.

### 3.1 Authentication

| ID      | Requirement                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | A visitor can sign up with name, email and password. Email must be unique.                                    |
| AUTH-02 | Password is at least 8 characters. better-auth stores only the hash (in `account.password`).                  |
| AUTH-03 | A user can sign in with email and password. Wrong credentials show one generic error, without saying which field was wrong. |
| AUTH-04 | A user can sign out from any page. The session cookie is cleared.                                             |
| AUTH-05 | Signed-in users visiting `/login` or `/signup` are redirected to `/notes`.                                    |
| AUTH-06 | Visitors without a session who open any `/notes` route are redirected to `/login`, then back to the original page after sign-in. |
| AUTH-07 | Sessions last 7 days and refresh on activity.                                                                 |

### 3.2 Notes management

| ID      | Requirement                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| NOTE-01 | A user can create a note from the notes list. It opens straight in the editor with the title "Untitled".      |
| NOTE-02 | The notes list shows only the user's own notes, sorted by last updated, newest first. Each row shows title, last updated time and a "Shared" badge if public. |
| NOTE-03 | A user can open a note to view and edit it on the same page.                                                  |
| NOTE-04 | Title is a plain text field, 1 to 200 characters. An empty title saves as "Untitled".                         |
| NOTE-05 | Content autosaves 1 second after typing stops. The page shows "Saving…", "Saved" or "Save failed – Retry".    |
| NOTE-06 | Leaving the page with unsaved changes triggers a save first; if it fails, the browser warns before leaving.   |
| NOTE-07 | A user can delete a note after a confirm dialog. Deletion is permanent and also ends public sharing.          |
| NOTE-08 | Empty state: a user with no notes sees a message and a "Create your first note" button.                       |
| NOTE-09 | Content size is capped at 1 MB of JSON per note. Larger saves are rejected with a clear message.              |

### 3.3 Rich text editor

| ID      | Format                                                  | Toolbar control     | Keyboard / markdown shortcut |
| ------- | ------------------------------------------------------- | ------------------- | ---------------------------- |
| EDIT-01 | Bold                                                    | B button            | `Ctrl/Cmd+B`, `**text**`     |
| EDIT-02 | Italic                                                  | I button            | `Ctrl/Cmd+I`, `*text*`       |
| EDIT-03 | Heading 1, 2, 3                                         | Block type dropdown | `# `, `## `, `### `          |
| EDIT-04 | Normal text                                             | Block type dropdown | `Ctrl/Cmd+Alt+0`             |
| EDIT-05 | Inline code                                             | Code button         | `` `text` ``                 |
| EDIT-06 | Code block with syntax highlighting and language picker | Code block button   | ` ``` `                      |
| EDIT-07 | Bullet list (nested allowed)                            | List button         | `- ` or `* `                 |
| EDIT-08 | Horizontal rule                                         | Separator button    | `---`                        |

- **EDIT-09:** Toolbar buttons show the active state for the current selection.
- **EDIT-10:** Undo and redo work with `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`.
- **EDIT-11:** Any other format (links, images, tables, ordered lists, strike) is disabled in the schema, so pasting it keeps only the plain text.
- **EDIT-12:** Content is stored as TipTap JSON (`editor.getJSON()`), never as HTML.

### 3.4 Public sharing

| ID       | Requirement                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| SHARE-01 | The note owner can turn sharing on. The app creates a random token (at least 128 bits, URL-safe) and shows the link `/share/<token>` with a Copy button. |
| SHARE-02 | Anyone with the link, signed in or not, sees a read-only page with the title, content and last updated time. No editor, no owner email. |
| SHARE-03 | The owner can turn sharing off. The token is deleted and the old link returns 404 at once.                   |
| SHARE-04 | Turning sharing on again creates a new token, so old links never work again.                                 |
| SHARE-05 | Edits by the owner show on the shared page on the next load.                                                 |
| SHARE-06 | Shared pages send `noindex` so search engines do not list them.                                              |
| SHARE-07 | Unknown or revoked tokens return the same 404 page, so tokens cannot be probed.                              |

---

## 4. Data model and SQLite schema

The database has two groups of tables:

| Group | Tables                                      | Owner       | Created by                         |
| ----- | ------------------------------------------- | ----------- | ---------------------------------- |
| Auth  | `user`, `session`, `account`, `verification` | better-auth | better-auth CLI (`auth generate`)  |
| App   | `notes`                                     | the app     | `db/migrations/*.sql`              |

The app **never writes** to the auth tables directly; all changes go through the better-auth API. The app only **reads** `user.id` from the server session to scope notes queries.

### 4.1 Auth tables (owned by better-auth)

better-auth expects a fixed core schema. Column names are **camelCase** (better-auth defaults), and the table names are singular. In SQLite, booleans are stored as `INTEGER` (0/1) and dates as `date` columns written by the Kysely adapter.

#### How the tables are created

1. Configure `lib/auth.ts` (database, email and password provider, session settings).
2. Generate the SQL with the better-auth CLI:

   ```bash
   bun x auth@latest generate --output db/migrations/000_better_auth.sql
   ```

3. Commit the generated file. It runs first through the normal migration runner (`bun run migrate`), so the `user` table exists before `notes` references it.

> Using `auth generate` into a numbered migration file (instead of `auth migrate`) keeps one migration runner and one `schema_migrations` history for the whole database. Re-run `generate` whenever the better-auth config or plugins change, and save the diff as a new numbered migration.

#### `user`

| Column          | Type      | Constraints              | Notes                                         |
| --------------- | --------- | ------------------------ | --------------------------------------------- |
| `id`            | `text`    | PRIMARY KEY              | Generated by better-auth                      |
| `name`          | `text`    | NOT NULL                 | Display name from sign-up (AUTH-01)           |
| `email`         | `text`    | NOT NULL, UNIQUE         | Unique email (AUTH-01)                        |
| `emailVerified` | `integer` | NOT NULL                 | Boolean; always `0` in v1 (no verification)   |
| `image`         | `text`    | nullable                 | Unused in v1                                  |
| `createdAt`     | `date`    | NOT NULL                 |                                               |
| `updatedAt`     | `date`    | NOT NULL                 |                                               |

#### `session`

| Column      | Type   | Constraints                                     | Notes                                 |
| ----------- | ------ | ----------------------------------------------- | ------------------------------------- |
| `id`        | `text` | PRIMARY KEY                                     |                                       |
| `expiresAt` | `date` | NOT NULL                                        | 7 days, extended on activity (AUTH-07) |
| `token`     | `text` | NOT NULL, UNIQUE                                | Value stored in the session cookie    |
| `createdAt` | `date` | NOT NULL                                        |                                       |
| `updatedAt` | `date` | NOT NULL                                        |                                       |
| `ipAddress` | `text` | nullable                                        |                                       |
| `userAgent` | `text` | nullable                                        |                                       |
| `userId`    | `text` | NOT NULL, REFERENCES `user(id)` ON DELETE CASCADE |                                     |

#### `account`

One row per sign-in method. For email and password, `providerId = 'credential'` and the password hash lives here — **not** on `user`.

| Column                  | Type   | Constraints                                       | Notes                                      |
| ----------------------- | ------ | ------------------------------------------------- | ------------------------------------------ |
| `id`                    | `text` | PRIMARY KEY                                       |                                            |
| `accountId`             | `text` | NOT NULL                                          | Equals `userId` for the credential provider |
| `providerId`            | `text` | NOT NULL                                          | `'credential'` in v1                       |
| `userId`                | `text` | NOT NULL, REFERENCES `user(id)` ON DELETE CASCADE |                                            |
| `accessToken`           | `text` | nullable                                          | OAuth only; unused in v1                   |
| `refreshToken`          | `text` | nullable                                          | OAuth only; unused in v1                   |
| `idToken`               | `text` | nullable                                          | OAuth only; unused in v1                   |
| `accessTokenExpiresAt`  | `date` | nullable                                          | OAuth only; unused in v1                   |
| `refreshTokenExpiresAt` | `date` | nullable                                          | OAuth only; unused in v1                   |
| `scope`                 | `text` | nullable                                          | OAuth only; unused in v1                   |
| `password`              | `text` | nullable                                          | Password hash (AUTH-02)                    |
| `createdAt`             | `date` | NOT NULL                                          |                                            |
| `updatedAt`             | `date` | NOT NULL                                          |                                            |

#### `verification`

Core better-auth table for email verification and password reset tokens. It is created because better-auth requires it, but stays empty in v1 (both features are out of scope).

| Column       | Type   | Constraints | Notes |
| ------------ | ------ | ----------- | ----- |
| `id`         | `text` | PRIMARY KEY |       |
| `identifier` | `text` | NOT NULL    |       |
| `value`      | `text` | NOT NULL    |       |
| `expiresAt`  | `date` | NOT NULL    |       |
| `createdAt`  | `date` | NOT NULL    |       |
| `updatedAt`  | `date` | NOT NULL    |       |

#### Reference SQL (what the CLI generates for SQLite)

This is for review only — always use the CLI output as the source of truth, since it follows the installed better-auth version and plugins.

```sql
CREATE TABLE "user" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "name"          TEXT NOT NULL,
  "email"         TEXT NOT NULL UNIQUE,
  "emailVerified" INTEGER NOT NULL,
  "image"         TEXT,
  "createdAt"     DATE NOT NULL,
  "updatedAt"     DATE NOT NULL
);

CREATE TABLE "session" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "expiresAt" DATE NOT NULL,
  "token"     TEXT NOT NULL UNIQUE,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
);

CREATE TABLE "account" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  DATE,
  "refreshTokenExpiresAt" DATE,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             DATE NOT NULL,
  "updatedAt"             DATE NOT NULL
);

CREATE TABLE "verification" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  DATE NOT NULL,
  "createdAt"  DATE NOT NULL,
  "updatedAt"  DATE NOT NULL
);
```

#### better-auth config (`lib/auth.ts`)

```ts
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db/client"; // bun:sqlite Database

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,          // AUTH-02
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,   // 7 days (AUTH-07)
    updateAge: 60 * 60 * 24,       // refresh once a day on activity
  },
  rateLimit: { enabled: true },    // SEC-10
  advanced: {
    database: { joins: true },     // faster /get-session (Kysely SQLite dialect)
  },
  plugins: [nextCookies()],        // lets Server Actions set auth cookies
});
```

> **Naming note:** auth tables use camelCase columns (`userId`, `createdAt`) because that is what better-auth expects. The app's own `notes` table uses snake_case (`user_id`, `created_at`). Do not rename better-auth columns unless you also set the matching `fields` mapping in the config and regenerate the schema.

### 4.2 App tables (owned by the app)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

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
```

`notes.user_id` points at better-auth's `user.id`. Deleting a user cascades to their notes, sessions and accounts.

| Column                       | Rule                                                                    |
| ---------------------------- | ----------------------------------------------------------------------- |
| `content_json`               | Valid TipTap JSON, checked with `JSON.parse` and a schema check before saving |
| `is_public` / `public_slug`  | Both set together: shared = `1` + token, not shared = `0` + `NULL`      |
| `updated_at`                 | Set by the app on every title or content change, not on share toggles   |

### 4.3 TypeScript types

```ts
import type { JSONContent } from "@tiptap/core";

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
```

User and session types are not hand-written; use the types inferred from the auth instance:

```ts
export type Session = typeof auth.$Infer.Session;   // { session, user }
export type User = Session["user"];
```

### 4.4 Migrations

- Plain numbered `.sql` files in `db/migrations`, run by `bun run migrate` at start-up.
- A `schema_migrations` table records which have run.
- Order:
  - `000_better_auth.sql` — generated by the better-auth CLI (auth tables)
  - `001_notes.sql` — the `notes` table and index

---

## 5. Routes, pages and server actions

Pages read data in Server Components; every change goes through a Server Action that checks the session first.

### Pages

| Route               | Access      | Purpose                                                  |
| ------------------- | ----------- | -------------------------------------------------------- |
| `/`                 | Public      | Landing page; redirects to `/notes` when signed in       |
| `/login`            | Guests only | Sign-in form                                             |
| `/signup`           | Guests only | Sign-up form                                             |
| `/notes`            | Signed in   | Notes list, New note button, empty state                 |
| `/notes/[id]`       | Owner only  | Title field, editor, autosave status, Share and Delete controls |
| `/share/[slug]`     | Public      | Read-only rendered note, `noindex`                       |
| `/api/auth/[...all]` | —          | better-auth handler                                      |

### Server Actions (`app/notes/actions.ts`)

| Action                               | Input        | Result                                |
| ------------------------------------ | ------------ | ------------------------------------- |
| `createNote()`                       | —            | New note id; redirect to `/notes/[id]` |
| `updateNote(id, { title?, content? })` | Partial update | `{ ok, updatedAt }`                 |
| `deleteNote(id)`                     | Note id      | Redirect to `/notes`                  |
| `shareNote(id)`                      | Note id      | `{ ok, url }` with a new token        |
| `unshareNote(id)`                    | Note id      | `{ ok }`                              |

Every action validates input with Zod and returns `{ ok: false, error }` instead of throwing to the client. A note that does not exist or belongs to someone else returns the same "not found" error.

Each action gets the user with `auth.api.getSession({ headers: await headers() })` and uses `session.user.id` as the owner id.

> **Middleware:** `middleware.ts` checks only that a session cookie exists on `/notes/*` (e.g. with `getSessionCookie()` from `better-auth/cookies`) and redirects to `/login` if not. The real session check happens again inside each page and action, because middleware alone is not a security boundary.

> **Rendering shared notes:** `/share/[slug]` turns the stored JSON into HTML on the server with `generateHTML()` from `@tiptap/html`, using the same extension list as the editor. No TipTap editor code is sent to the browser on this page.

---

## 6. Security and authorization

Every query on `notes` includes the owner's `user_id`, so one user can never read or change another user's note, even with a guessed id.

| ID     | Rule                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------- |
| SEC-01 | All note SQL filters by `user_id = ?` from the server session, never from client input.              |
| SEC-02 | Only prepared statements with bound parameters. No string-built SQL.                                 |
| SEC-03 | Another user's note and a missing note both return 404, so ids cannot be probed.                     |
| SEC-04 | The share page selects only `title`, `content_json` and `updated_at` where `public_slug = ? AND is_public = 1`. |
| SEC-05 | Tokens come from `crypto.getRandomValues` (16+ bytes, base64url). Never derived from the note id.    |
| SEC-06 | Stored JSON is checked against the allowed node and mark types before saving; unknown types are rejected. |
| SEC-07 | Shared HTML is generated only from the allowed extensions, so no raw HTML or scripts are output.     |
| SEC-08 | Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.                          |
| SEC-09 | Server Actions rely on Next.js origin checks for CSRF protection; no extra GET endpoints change data. |
| SEC-10 | Sign-in and sign-up are rate limited with better-auth's built-in limiter.                            |
| SEC-11 | Secrets (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) live in environment variables, never in the repo.  |
| SEC-12 | The app never runs `INSERT`/`UPDATE`/`DELETE` on `user`, `session`, `account` or `verification`; only better-auth does. |

---

## 7. Non-functional requirements

| ID     | Area          | Requirement                                                                                  |
| ------ | ------------- | -------------------------------------------------------------------------------------------- |
| NFR-01 | Performance   | Notes list loads in under 500 ms server time for 1,000 notes.                                |
| NFR-02 | Performance   | Autosave round trip under 300 ms for a 50 KB note on the server.                             |
| NFR-03 | Responsive    | Usable from 360 px wide; toolbar wraps or scrolls on small screens.                          |
| NFR-04 | Theme         | Light and dark mode follow the system setting.                                               |
| NFR-05 | Accessibility | All toolbar buttons have labels and keyboard focus; forms have linked labels; WCAG 2.1 AA colour contrast. |
| NFR-06 | Browsers      | Latest two versions of Chrome, Firefox, Safari and Edge.                                     |
| NFR-07 | Reliability   | A failed save never loses the user's text; the editor keeps it and retries.                  |
| NFR-08 | Code quality  | ESLint and Prettier pass; `tsc --noEmit` passes with no errors.                              |
| NFR-09 | Backups       | The SQLite file is backed up daily with `VACUUM INTO` to a separate location.                |

---

## 8. Project structure

```text
.
├── app/
│   ├── layout.tsx
│   ├── page.tsx                 # landing
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── notes/
│   │   ├── page.tsx             # list
│   │   ├── [id]/page.tsx        # editor page
│   │   └── actions.ts           # server actions
│   ├── share/[slug]/page.tsx    # public read-only view
│   └── api/auth/[...all]/route.ts
├── components/
│   ├── editor/Editor.tsx        # TipTap client component
│   ├── editor/Toolbar.tsx
│   ├── NoteList.tsx
│   └── ShareDialog.tsx
├── lib/
│   ├── auth.ts                  # better-auth server config
│   ├── auth-client.ts
│   ├── editor-extensions.ts     # shared by editor and generateHTML
│   └── db/
│       ├── client.ts            # bun:sqlite connection + pragmas
│       └── notes.ts             # all notes SQL
├── db/migrations/
│   ├── 000_better_auth.sql      # generated by better-auth CLI
│   └── 001_notes.sql
├── scripts/migrate.ts
├── tests/unit/                  # bun test
├── tests/e2e/                   # Playwright
├── middleware.ts
└── package.json
```

`lib/editor-extensions.ts` is the single source of the allowed formats. The editor, the JSON check (SEC-06) and the shared-page renderer all import it, so they can never drift apart.

### Scripts

```json
{
  "dev": "bun --bun next dev",
  "build": "bun --bun next build",
  "start": "bun --bun next start",
  "migrate": "bun run scripts/migrate.ts",
  "auth:generate": "bun x auth@latest generate",
  "test": "bun test tests/unit",
  "test:e2e": "playwright test"
}
```

---

## 9. Testing strategy and acceptance criteria

Unit tests cover the data layer against a temporary SQLite file; Playwright covers every user flow end to end against a fresh database (all migrations, including the better-auth tables, applied).

### Unit tests (`bun test`)

- Repository functions: create, list, get, update, delete, share, unshare
- Ownership: every function returns nothing for another user's note
- Share token: new token each time, old token no longer resolves
- JSON check: rejects unknown node types, oversized content and invalid JSON
- Cascade: deleting a `user` row removes their notes

### End-to-end tests (Playwright)

| ID     | Scenario                                   | Expected result                                       | Covers             |
| ------ | ------------------------------------------ | ----------------------------------------------------- | ------------------ |
| E2E-01 | Sign up, sign out, sign in                 | Lands on `/notes` each time; session persists on reload | AUTH-01–05       |
| E2E-02 | Open `/notes` while signed out             | Redirect to `/login`, then back after sign-in         | AUTH-06            |
| E2E-03 | Create a note, type text, reload           | Text and title still there; status shows "Saved"      | NOTE-01, 05        |
| E2E-04 | Apply each format, reload                  | Every format from 3.3 renders the same after reload   | EDIT-01–08         |
| E2E-05 | Paste a link and an image                  | Only plain text kept                                  | EDIT-11            |
| E2E-06 | Delete a note                              | Gone from list; its URL returns 404                   | NOTE-07            |
| E2E-07 | User B opens User A's note URL             | 404, no data shown                                    | SEC-01, 03         |
| E2E-08 | Share, open link in a signed-out context   | Read-only page shows note; no editor                  | SHARE-01, 02       |
| E2E-09 | Stop sharing, reopen old link              | 404                                                   | SHARE-03           |
| E2E-10 | Share again                                | New link works, the first link still 404              | SHARE-04           |
| E2E-11 | Edit a shared note, reload share page      | Shows the new content                                 | SHARE-05           |
| E2E-12 | Delete a shared note, open its link        | 404                                                   | NOTE-07, SHARE-03  |
| E2E-13 | Go offline while typing, then reconnect    | "Save failed – Retry" shows, retry saves, no text lost | NFR-07            |
| E2E-14 | Run main flows at 360 px width             | All controls reachable                                | NFR-03             |

### Definition of done for v1

- [ ] All requirements in sections 3 and 6 implemented
- [ ] Unit and e2e suites pass in CI
- [ ] `tsc`, ESLint and Prettier pass
- [ ] Accessibility check (axe) shows no serious or critical issues on all pages

---

## 10. Deployment and milestones

The app deploys as one Docker container on a VPS, with the SQLite file on a mounted volume so data survives redeploys.

- **Base image:** `oven/bun`; run `bun run migrate` then `bun --bun next start`
- **Volume:** `/data/app.db`, path set by `DATABASE_PATH`
- **HTTPS:** through a reverse proxy (Caddy or Nginx)
- **Not suitable** for serverless hosts such as Vercel, which have no persistent disk and no Bun runtime for `bun:sqlite`

### Build order

1. **Project setup:** Next.js on Bun, Tailwind, TypeScript strict, lint, scripts
2. **Database:** connection, pragmas, migration runner
3. **Auth:** better-auth config, generate `000_better_auth.sql` with the CLI, sign-up, sign-in, sign-out, route protection
4. **Notes CRUD:** `001_notes.sql`, repository module, Server Actions, list and editor pages
5. **Editor:** TipTap with the allowed extensions, toolbar, autosave
6. **Sharing:** share dialog, tokens, public page with `generateHTML`
7. **Hardening:** JSON checks, rate limits, error states, accessibility
8. **Tests and deployment:** unit and e2e suites, Dockerfile, backups
