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
  {
    id: 3,
    name: 'add accounts, per-account data and per-account API keys',
    up(db) {
      // The account. The identity provider keeps the real profile; the only
      // name here is a display name, generated on sign-up and the person's to
      // change. It is a label, not an identifier: nothing resolves by it, so it
      // carries no uniqueness and no character rules.
      db.exec(
        `CREATE TABLE users (
           id TEXT PRIMARY KEY,
           subject TEXT NOT NULL UNIQUE,
           display_name TEXT NOT NULL,
           created_at TEXT NOT NULL
         )`
      );

      // Third-party keys, held per account and keyed by kind rather than as
      // columns, so adding a provider later needs no schema change. `secret` is
      // encrypted; `hint` is the few characters the settings screen shows to
      // tell keys apart.
      db.exec(
        `CREATE TABLE user_credentials (
           user_id TEXT NOT NULL,
           kind TEXT NOT NULL,
           secret TEXT NOT NULL,
           hint TEXT NOT NULL,
           updated_at TEXT NOT NULL,
           PRIMARY KEY (user_id, kind)
         )`
      );

      // Ownership. Nullable because SQLite cannot add a NOT NULL column to an
      // existing table without a default, and an owner is not something to
      // invent. Nothing assigns one to rows that predate accounts: an install
      // still holding such rows needs a one-off UPDATE, and the DB layer makes
      // the owner a required argument so new rows always have one.
      db.exec('ALTER TABLE cards ADD COLUMN user_id TEXT');
      db.exec('ALTER TABLE sessions ADD COLUMN user_id TEXT');
      db.exec('ALTER TABLE llm_usage ADD COLUMN user_id TEXT');

      // Every read is filtered by owner, so these carry the common queries.
      db.exec('CREATE INDEX idx_cards_user ON cards (user_id)');
      db.exec('CREATE INDEX idx_sessions_user ON sessions (user_id)');
      db.exec('CREATE INDEX idx_llm_usage_user ON llm_usage (user_id)');
    },
  },
  {
    id: 4,
    name: 'drop the unused kind columns',
    up(db) {
      // Added by an ad-hoc ALTER before migrations existed, then abandoned: no
      // code reads it and every row holds the default. It survives only on
      // databases old enough to have received that ALTER, which is why it is
      // dropped conditionally -- a newer database never had it. Removing it
      // makes every database agree on the schema again.
      for (const table of ['cards', 'sessions']) {
        const columns = db.prepare(`PRAGMA table_info(${table})`).all() as {
          name: string;
        }[];
        if (columns.some(c => c.name === 'kind')) {
          db.exec(`ALTER TABLE ${table} DROP COLUMN kind`);
        }
      }
    },
  },
  {
    id: 5,
    name: 'require an owner on cards and sessions',
    up(db) {
      // SQLite cannot add a constraint to an existing column, so the table is
      // rebuilt. The new definition is derived from the current one rather than
      // written out here: spelling it out would silently drop any column this
      // file did not know about. A row without an owner fails the copy, which
      // is the right outcome -- an owner is not something to invent.
      requireOwner(db, 'cards', 'idx_cards_user');
      requireOwner(db, 'sessions', 'idx_sessions_user');
    },
  },
];

function requireOwner(
  db: Database.Database,
  table: string,
  index: string
): void {
  const { sql } = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { sql: string };
  const columns = (
    db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  )
    .map(c => c.name)
    .join(', ');

  db.exec(
    sql
      .replace(`CREATE TABLE ${table}`, `CREATE TABLE ${table}_rebuilt`)
      .replace(/user_id TEXT(?! NOT NULL)/, 'user_id TEXT NOT NULL')
  );
  db.exec(
    `INSERT INTO ${table}_rebuilt (${columns}) SELECT ${columns} FROM ${table}`
  );
  db.exec(`DROP TABLE ${table}`);
  db.exec(`ALTER TABLE ${table}_rebuilt RENAME TO ${table}`);
  // The index went with the old table.
  db.exec(`CREATE INDEX ${index} ON ${table} (user_id)`);
}
