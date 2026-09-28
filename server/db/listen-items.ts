import { randomUUID } from 'node:crypto';
import { db } from './open.js';
import { newPublicId } from './scoped-public-id.js';

// A song its creator wants to listen to later. Always private to that account,
// even inside a shared project. It is not a card and takes no part in recall.
export interface ListenItem {
  id: string;
  public_id: string;
  project_id: string;
  user_id: string;
  title: string;
  artist: string;
  player: string | null;
  created_at: string;
}

export interface NewListenItem {
  title: string;
  artist: string;
  player: string | null;
}

export function createListenItem(
  projectId: string,
  userId: string,
  input: NewListenItem
): ListenItem {
  const item: ListenItem = {
    id: randomUUID(),
    public_id: newPublicId('listen_items', projectId),
    project_id: projectId,
    user_id: userId,
    ...input,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO listen_items
       (id, public_id, project_id, user_id, title, artist, player, created_at)
     VALUES
       (@id, @public_id, @project_id, @user_id, @title, @artist, @player,
        @created_at)`
  ).run(item);
  return item;
}

export function listListenItems(
  projectId: string,
  userId: string
): ListenItem[] {
  return db
    .prepare(
      `SELECT * FROM listen_items
       WHERE project_id = ? AND user_id = ?
       ORDER BY created_at ASC, rowid ASC`
    )
    .all(projectId, userId) as ListenItem[];
}

export function getListenItemByPublicId(
  projectId: string,
  publicId: string,
  userId: string
): ListenItem | undefined {
  return db
    .prepare(
      `SELECT * FROM listen_items
       WHERE project_id = ? AND public_id = ? AND user_id = ?`
    )
    .get(projectId, publicId, userId) as ListenItem | undefined;
}

export function findListenItemByPlayer(
  projectId: string,
  userId: string,
  player: string
): ListenItem | undefined {
  return db
    .prepare(
      `SELECT * FROM listen_items
       WHERE project_id = ? AND user_id = ? AND player = ?`
    )
    .get(projectId, userId, player) as ListenItem | undefined;
}

// Mirrors findListenItemByPlayer for plain-text entries (no player): an exact
// match on the trimmed text, so adding the same title twice is a no-op rather
// than a second row. Scoped to player IS NULL so it never matches a URL entry
// whose resolved title happens to equal what was typed.
export function findListenItemByTitle(
  projectId: string,
  userId: string,
  title: string
): ListenItem | undefined {
  return db
    .prepare(
      `SELECT * FROM listen_items
       WHERE project_id = ? AND user_id = ? AND player IS NULL AND title = ?`
    )
    .get(projectId, userId, title) as ListenItem | undefined;
}

export function deleteListenItem(id: string, userId: string): void {
  db.prepare('DELETE FROM listen_items WHERE id = ? AND user_id = ?').run(
    id,
    userId
  );
}
