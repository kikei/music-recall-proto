import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { generatePublicId } from '../ids/public-id.js';

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
  {
    id: 6,
    name: 'add projects, memberships and public ids',
    up(db) {
      db.exec(
        `CREATE TABLE projects (
           id TEXT PRIMARY KEY,
           slug TEXT NOT NULL UNIQUE,
           name TEXT NOT NULL,
           default_card_visibility TEXT NOT NULL DEFAULT 'private'
             CHECK (default_card_visibility IN ('private', 'members', 'public')),
           created_at TEXT NOT NULL
         );

         CREATE TABLE project_members (
           project_id TEXT NOT NULL,
           user_id TEXT NOT NULL,
           role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
           joined_at TEXT NOT NULL,
           PRIMARY KEY (project_id, user_id),
           FOREIGN KEY (project_id) REFERENCES projects (id),
           FOREIGN KEY (user_id) REFERENCES users (id)
         );

         CREATE INDEX idx_project_members_user
           ON project_members (user_id);`
      );

      db.exec('ALTER TABLE cards ADD COLUMN project_id TEXT');
      db.exec('ALTER TABLE cards ADD COLUMN public_id TEXT');
      db.exec('ALTER TABLE cards ADD COLUMN created_by_user_id TEXT');
      db.exec(
        `ALTER TABLE cards ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
           CHECK (visibility IN ('private', 'members', 'public'))`
      );
      db.exec('ALTER TABLE sessions ADD COLUMN project_id TEXT');
      db.exec('ALTER TABLE sessions ADD COLUMN public_id TEXT');
      db.exec('ALTER TABLE sessions ADD COLUMN created_by_user_id TEXT');

      const users = db.prepare('SELECT id FROM users').all() as {
        id: string;
      }[];
      const insertProject = db.prepare(
        `INSERT INTO projects
           (id, slug, name, default_card_visibility, created_at)
         VALUES (?, ?, '音楽想起エンジン', 'private', ?)`
      );
      const insertMember = db.prepare(
        `INSERT INTO project_members (project_id, user_id, role, joined_at)
         VALUES (?, ?, 'owner', ?)`
      );
      const updateCards = db.prepare(
        `UPDATE cards SET project_id = ?, created_by_user_id = ?
         WHERE user_id = ?`
      );
      const updateSessions = db.prepare(
        `UPDATE sessions SET project_id = ?, created_by_user_id = ?
         WHERE user_id = ?`
      );

      for (const user of users) {
        const projectId = randomUUID();
        const now = new Date().toISOString();
        insertProject.run(
          projectId,
          uniqueValue(db, 'projects', 'slug', 'music-'),
          now
        );
        insertMember.run(projectId, user.id, now);
        updateCards.run(projectId, user.id, user.id);
        updateSessions.run(projectId, user.id, user.id);
      }

      assignPublicIds(db, 'cards');
      assignPublicIds(db, 'sessions');
      requireProjectColumns(db, 'cards');
      requireProjectColumns(db, 'sessions');
      db.exec('CREATE INDEX idx_cards_user ON cards (user_id)');
      db.exec('CREATE INDEX idx_sessions_user ON sessions (user_id)');
      db.exec('CREATE INDEX idx_cards_project ON cards (project_id)');
      db.exec('CREATE INDEX idx_sessions_project ON sessions (project_id)');
      db.exec(
        `CREATE UNIQUE INDEX idx_cards_project_public
           ON cards (project_id, public_id)`
      );
      db.exec(
        `CREATE UNIQUE INDEX idx_sessions_project_public
           ON sessions (project_id, public_id)`
      );
    },
  },
  {
    id: 7,
    name: 'allow generated project ids to be chosen once',
    up(db) {
      // Projects created while migrating existing accounts receive a temporary
      // generated slug. Let the owner replace that value once, then keep the
      // chosen URL stable. Projects created through the UI already have a slug
      // chosen by their owner and start locked.
      db.exec(
        `ALTER TABLE projects ADD COLUMN slug_locked INTEGER NOT NULL DEFAULT 1
           CHECK (slug_locked IN (0, 1))`
      );
      db.exec("UPDATE projects SET slug_locked = 0 WHERE slug LIKE 'music-%'");
    },
  },
  {
    id: 8,
    name: 'allow project ids to be renamed',
    up(db) {
      // Project identity is the internal UUID. The slug is a user-facing URL
      // component and may change; old URLs deliberately stop resolving.
      db.exec('ALTER TABLE projects DROP COLUMN slug_locked');
    },
  },
  {
    id: 9,
    name: 'make cards public by default',
    up(db) {
      // This changes only what future cards inherit. Existing cards keep their
      // own visibility, including every private card migrated in version 6.
      db.exec("UPDATE projects SET default_card_visibility = 'public'");
    },
  },
  {
    id: 10,
    name: 'remove implicit visibility defaults',
    up(db) {
      // Version 6 needed DEFAULT 'private' so SQLite could populate a new
      // NOT NULL column on existing rows. The migrated values are now real row
      // data; keeping that schema default would silently hide future rows when
      // a caller forgets to choose visibility. Project creation and card
      // creation both pass an explicit value instead.
      removeTextDefault(db, 'projects', 'default_card_visibility', 'private');
      removeTextDefault(db, 'cards', 'visibility', 'private');
    },
  },
];

function uniqueValue(
  db: Database.Database,
  table: string,
  column: string,
  prefix = ''
): string {
  for (;;) {
    const value = prefix + generatePublicId();
    const found = db
      .prepare(`SELECT 1 FROM ${table} WHERE ${column} = ?`)
      .get(value);
    if (!found) return value;
  }
}

function assignPublicIds(
  db: Database.Database,
  table: 'cards' | 'sessions'
): void {
  const rows = db.prepare(`SELECT id, project_id FROM ${table}`).all() as {
    id: string;
    project_id: string;
  }[];
  const update = db.prepare(`UPDATE ${table} SET public_id = ? WHERE id = ?`);
  for (const row of rows) {
    let publicId: string;
    do {
      publicId = generatePublicId();
    } while (
      db
        .prepare(
          `SELECT 1 FROM ${table} WHERE project_id = ? AND public_id = ?`
        )
        .get(row.project_id, publicId)
    );
    update.run(publicId, row.id);
  }
}

function requireProjectColumns(
  db: Database.Database,
  table: 'cards' | 'sessions'
): void {
  rebuildTable(
    db,
    table,
    sql => {
      let rebuilt = sql.replace(
        new RegExp(
          `CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?[\"']?${table}[\"']?`,
          'i'
        ),
        `CREATE TABLE ${table}_rebuilt`
      );
      for (const column of ['project_id', 'public_id', 'created_by_user_id']) {
        rebuilt = rebuilt.replace(
          new RegExp(`${column} TEXT(?! NOT NULL)`),
          `${column} TEXT NOT NULL`
        );
      }
      return rebuilt;
    },
    []
  );
}

function removeTextDefault(
  db: Database.Database,
  table: string,
  column: string,
  value: string
): void {
  const schemaObjects = db
    .prepare(
      `SELECT sql FROM sqlite_master
       WHERE tbl_name = ? AND type IN ('index', 'trigger') AND sql IS NOT NULL`
    )
    .all(table) as { sql: string }[];
  rebuildTable(
    db,
    table,
    sql => {
      const createRebuilt = sql.replace(
        new RegExp(
          `CREATE TABLE\\s+(?:IF NOT EXISTS\\s+)?["']?${table}["']?`,
          'i'
        ),
        `CREATE TABLE ${table}_rebuilt`
      );
      const withoutDefault = createRebuilt.replace(
        new RegExp(
          `${column}\\s+TEXT\\s+NOT\\s+NULL\\s+DEFAULT\\s+'${value}'`,
          'i'
        ),
        `${column} TEXT NOT NULL`
      );
      if (withoutDefault === createRebuilt) {
        throw new Error(`${table}.${column} default was not found`);
      }
      return withoutDefault;
    },
    schemaObjects
  );
}

function requireOwner(
  db: Database.Database,
  table: string,
  index: string
): void {
  rebuildTable(
    db,
    table,
    sql =>
      sql
        .replace(`CREATE TABLE ${table}`, `CREATE TABLE ${table}_rebuilt`)
        .replace(/user_id TEXT(?! NOT NULL)/, 'user_id TEXT NOT NULL'),
    []
  );
  // The index went with the old table.
  db.exec(`CREATE INDEX ${index} ON ${table} (user_id)`);
}

function rebuildTable(
  db: Database.Database,
  table: string,
  rewrite: (sql: string) => string,
  schemaObjects: readonly { sql: string }[]
): void {
  const { sql } = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { sql: string };
  const columns = (
    db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  )
    .map(item => item.name)
    .join(', ');

  db.exec(rewrite(sql));
  db.exec(
    `INSERT INTO ${table}_rebuilt (${columns}) SELECT ${columns} FROM ${table}`
  );
  db.exec(`DROP TABLE ${table}`);
  db.exec(`ALTER TABLE ${table}_rebuilt RENAME TO ${table}`);
  for (const object of schemaObjects) db.exec(object.sql);
}
