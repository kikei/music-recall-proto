// Schema centered on reunion cards. The core data unit is not a "song" but a
// "listening experience (session)".
export const schema = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  base_card_id TEXT,
  player TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions (id)
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  hook TEXT NOT NULL,
  recall_phrase TEXT NOT NULL,
  background TEXT NOT NULL,
  embedding TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  recall_count INTEGER NOT NULL DEFAULT 0,
  player TEXT,
  player_resolved INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions (id)
);
`;
