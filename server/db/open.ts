import Database from 'better-sqlite3';
import { schema } from './schema.js';

const dbPath = process.env.DB_PATH ?? 'music-recall.sqlite';

// Share a single connection across the whole process.
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
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
