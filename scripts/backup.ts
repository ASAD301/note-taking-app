import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createDb } from "../lib/db/client";

// NFR-09: consistent online backup with VACUUM INTO. Run daily, e.g. from cron:
//   0 3 * * *  docker exec <container> bun run backup
const dir = resolve(process.env.BACKUP_DIR ?? "./backups");
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = join(dir, `app-${stamp}.db`);

const db = createDb();
db.query("VACUUM INTO ?").run(target);
db.close();
console.log(`Backup written to ${target}`);
