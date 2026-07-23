import type Database from 'better-sqlite3';

// One forward schema change. `id` is sequential and immutable once shipped:
// after a migration has run on a DB you cannot reset (a teammate's, later
// production), never edit it -- add a new one. `up` may run multiple statements;
// the runner wraps it in a transaction and records it in schema_migrations.
export interface Migration {
  id: number;
  name: string;
  up(db: Database.Database): void;
}

// The metadata column is left NULL for existing rows on purpose: the template
// scaffold is only seeded for newly created cards/sessions, not retrofitted.
export const migrations: Migration[] = [
  {
    id: 1,
    name: 'replace album with freeform card metadata',
    up(db) {
      // Album was an LLM guess, unused by recall and not editable -- drop it.
      db.exec('ALTER TABLE cards DROP COLUMN album');
      db.exec('ALTER TABLE sessions DROP COLUMN album');
      // Freeform, full-text-searchable reference notes. New cards get a blank
      // template; existing cards stay NULL until edited.
      db.exec('ALTER TABLE cards ADD COLUMN metadata TEXT');
    },
  },
  {
    id: 2,
    name: 'add freeform session metadata',
    up(db) {
      // Sessions carry metadata too, editable while listening and inherited by
      // the card on finish (like title/artist).
      db.exec('ALTER TABLE sessions ADD COLUMN metadata TEXT');
    },
  },
];
