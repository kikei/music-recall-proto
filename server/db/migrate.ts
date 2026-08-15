import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type Database from 'better-sqlite3';
import { migrations, type Migration } from './migrations.js';

// Forward-only migration runner. The base schema (CREATE TABLE IF NOT EXISTS)
// is applied first elsewhere as an idempotent baseline; this applies the
// numbered deltas on top and records each in schema_migrations so it runs once.
// There are no down migrations: the pre-migration file backup is the rollback.
export function runMigrations(db: Database.Database, dbPath: string): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       id INTEGER PRIMARY KEY,
       name TEXT NOT NULL,
       applied_at TEXT NOT NULL
     )`
  );

  const applied = new Set(
    (
      db.prepare('SELECT id FROM schema_migrations').all() as { id: number }[]
    ).map(r => r.id)
  );
  const pending = migrations
    .filter(m => !applied.has(m.id))
    .sort((a, b) => a.id - b.id);
  if (pending.length === 0) return;

  // Copy the DB file before touching data. This is the only way back, since the
  // migrations are forward-only.
  backup(db, dbPath);

  // Rebuilding a table means dropping one that others reference, which SQLite's
  // own guidance says to do with enforcement off; better-sqlite3 turns it on by
  // default. It cannot be changed inside a transaction, so it is handled here,
  // and what enforcement would have caught is checked once the work is done.
  const enforced = db.pragma('foreign_keys', { simple: true }) === 1;
  db.pragma('foreign_keys = OFF');
  try {
    for (const m of pending) apply(db, m);
    const broken = db.pragma('foreign_key_check') as unknown[];
    if (broken.length > 0) {
      throw new Error(
        `マイグレーションで参照整合性が壊れました (${broken.length} 件)。` +
          `${dbPath} をバックアップから戻してください。`
      );
    }
  } finally {
    if (enforced) db.pragma('foreign_keys = ON');
  }
}

function apply(db: Database.Database, m: Migration): void {
  const tx = db.transaction(() => {
    m.up(db);
    db.prepare(
      'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)'
    ).run(m.id, m.name, new Date().toISOString());
  });
  tx();
  console.log(`[migrate] applied ${m.id} ${m.name}`);
}

function backup(db: Database.Database, dbPath: string): void {
  // Fold the WAL back into the main file so the copy is a complete snapshot.
  db.pragma('wal_checkpoint(TRUNCATE)');
  const dir = join(dirname(dbPath), 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = join(dir, `pre-migrate-${stamp}.sqlite`);
  copyFileSync(dbPath, dest);
  console.log(`[migrate] backed up ${dbPath} -> ${dest}`);
}
