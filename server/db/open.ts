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

// These columns predate the versioned migration table. Check the schema
// explicitly so only the expected "already exists" case is skipped; an actual
// ALTER TABLE failure must stop startup.
function addLegacyColumn(
  table: 'cards' | 'sessions',
  column: string,
  definition: string
) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  if (!columns.some(existing => existing.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

addLegacyColumn(
  'cards',
  'recall_count',
  'recall_count INTEGER NOT NULL DEFAULT 0'
);
addLegacyColumn('sessions', 'base_card_id', 'base_card_id TEXT');
addLegacyColumn('sessions', 'player', 'player TEXT');
addLegacyColumn('cards', 'player', 'player TEXT');
addLegacyColumn(
  'cards',
  'player_resolved',
  'player_resolved INTEGER NOT NULL DEFAULT 0'
);

// Apply versioned schema migrations on top of the baseline. New structural
// changes go here as numbered migrations, not as ad-hoc ALTERs above.
runMigrations(db, dbPath);
