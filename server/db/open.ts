import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { schema } from './schema.js';
import { runMigrations } from './migrate.js';

const dbPath = process.env.DB_PATH ?? 'data/music-recall.sqlite';

// Make sure the directory exists before opening (better-sqlite3 does not
// create it).
mkdirSync(dirname(dbPath), { recursive: true });

// Share a single connection across the whole process.
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
// The base schema is the frozen baseline; it creates the tables for a fresh DB
// and is a no-op for an existing one. Structural changes since then live as
// numbered migrations (see runMigrations below), not edits to this baseline.
db.exec(schema);

// Retrofit migrations for existing DBs. Ignore if the column already exists.
try {
  db.exec(
    'ALTER TABLE cards ADD COLUMN recall_count INTEGER NOT NULL DEFAULT 0'
  );
} catch {
  // cards.recall_count already exists
}
try {
  db.exec('ALTER TABLE sessions ADD COLUMN base_card_id TEXT');
} catch {
  // sessions.base_card_id already exists
}
try {
  db.exec('ALTER TABLE sessions ADD COLUMN player TEXT');
} catch {
  // sessions.player already exists
}
try {
  db.exec('ALTER TABLE cards ADD COLUMN player TEXT');
} catch {
  // cards.player already exists
}
try {
  db.exec(
    'ALTER TABLE cards ADD COLUMN player_resolved INTEGER NOT NULL DEFAULT 0'
  );
} catch {
  // cards.player_resolved already exists
}

// Apply versioned schema migrations on top of the baseline. New structural
// changes go here as numbered migrations, not as ad-hoc ALTERs above.
runMigrations(db, dbPath);
