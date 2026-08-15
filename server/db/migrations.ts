import type Database from 'better-sqlite3';
import { generateDisplayName } from '../accounts/display-name.js';

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
    name: 'add accounts and scope data to them',
    up(db) {
      db.exec(
        `CREATE TABLE users (
           id TEXT PRIMARY KEY,
           subject TEXT NOT NULL UNIQUE,
           created_at TEXT NOT NULL
         )`
      );
      // Nullable: rows that predate accounts have no owner yet. The first
      // account to sign in claims them (see claimOwnerlessRows), which gives
      // each existing single-user install its data back without a manual step.
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
    name: 'store per-account third-party API keys',
    up(db) {
      // Rows keyed by kind rather than columns, so a new provider needs no
      // schema change. `secret` is encrypted; `hint` is the few trailing
      // characters the settings screen shows to tell keys apart.
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
    },
  },
  {
    id: 5,
    name: 'add a username to accounts',
    up(db) {
      db.exec('ALTER TABLE users ADD COLUMN username TEXT');
    },
  },
  {
    id: 6,
    name: 'give every account a unique username',
    up(db) {
      // Accounts that predate the column get a generated name, so the column is
      // never empty and the unique index below can be trusted from here on.
      const rows = db
        .prepare('SELECT id FROM users WHERE username IS NULL')
        .all() as { id: string }[];
      const update = db.prepare('UPDATE users SET username = ? WHERE id = ?');
      const taken = new Set(
        (
          db
            .prepare('SELECT username FROM users WHERE username IS NOT NULL')
            .all() as { username: string }[]
        ).map(r => r.username.toLowerCase())
      );
      for (const row of rows) {
        let name = generateDisplayName();
        while (taken.has(name.toLowerCase())) name = generateDisplayName();
        taken.add(name.toLowerCase());
        update.run(name, row.id);
      }
      // NOCASE so Fujii and fujii cannot both be taken. SQLite cannot add a
      // NOT NULL constraint to an existing column, so that side is held by the
      // account code, which always assigns a name.
      db.exec(
        'CREATE UNIQUE INDEX idx_users_username ON users (username COLLATE NOCASE)'
      );
    },
  },
  {
    id: 7,
    name: 'treat the account name as a display name, not an identifier',
    up(db) {
      // Only ever a label: shown in the sidebar and nowhere else. Dropping the
      // unique index removes the reason it had to be restricted to safe
      // characters, so any script, punctuation or emoji is fine. Anything that
      // must be an identifier later gets its own alphanumeric field.
      db.exec('DROP INDEX idx_users_username');
      db.exec('ALTER TABLE users RENAME COLUMN username TO display_name');
    },
  },
];
