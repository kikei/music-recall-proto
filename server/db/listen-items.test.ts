import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  createListenItem,
  deleteListenItem,
  findListenItemByPlayer,
  getListenItemByPublicId,
  listListenItems,
} from './listen-items.js';
import { db } from './open.js';
import { createProject } from './projects.js';
import { deleteUserAccount, findOrCreateUser } from './users.js';
import { deleteProjectOrThrow } from '../projects/delete-project.js';

function setup() {
  const user = findOrCreateUser(`listen-${randomUUID()}`);
  const project = createProject(
    user.id,
    'Listen list project',
    `listen-${randomUUID().slice(0, 12)}`,
    'public'
  );
  return { user, project };
}

function item(title: string, player: string | null = null) {
  return { title, artist: '', player };
}

describe('listen items', () => {
  it('lists the oldest item first', () => {
    const { user, project } = setup();
    const first = createListenItem(project.id, user.id, item('First'));
    const second = createListenItem(project.id, user.id, item('Second'));

    expect(listListenItems(project.id, user.id).map(found => found.id)).toEqual(
      [first.id, second.id]
    );
  });

  it('keeps each account items private, even inside a shared project', () => {
    const { user, project } = setup();
    const other = findOrCreateUser(`listen-other-${randomUUID()}`);
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES (?, ?, 'member', ?)`
    ).run(project.id, other.id, new Date().toISOString());
    const mine = createListenItem(project.id, user.id, item('Mine'));

    expect(listListenItems(project.id, other.id)).toEqual([]);
    expect(
      getListenItemByPublicId(project.id, mine.public_id, other.id)
    ).toBeUndefined();
    deleteListenItem(mine.id, other.id);
    expect(
      getListenItemByPublicId(project.id, mine.public_id, user.id)
    ).toBeDefined();
  });

  it('separates items by project', () => {
    const { user, project } = setup();
    const elsewhere = createProject(
      user.id,
      'Another project',
      `listen-${randomUUID().slice(0, 12)}`,
      'public'
    );
    createListenItem(project.id, user.id, item('Here'));

    expect(listListenItems(elsewhere.id, user.id)).toEqual([]);
  });

  it('finds an item by its stored player', () => {
    const { user, project } = setup();
    const player = JSON.stringify({ provider: 'youtube', id: 'abc' });
    const stored = createListenItem(project.id, user.id, item('', player));

    expect(findListenItemByPlayer(project.id, user.id, player)?.id).toBe(
      stored.id
    );
    expect(
      findListenItemByPlayer(project.id, user.id, '{"provider":"other"}')
    ).toBeUndefined();
  });

  it('deletes only the requested item', () => {
    const { user, project } = setup();
    const removed = createListenItem(project.id, user.id, item('Removed'));
    const kept = createListenItem(project.id, user.id, item('Kept'));

    deleteListenItem(removed.id, user.id);

    expect(listListenItems(project.id, user.id).map(found => found.id)).toEqual(
      [kept.id]
    );
  });

  it('is removed with a deleted project', () => {
    const { user, project } = setup();
    createProject(
      user.id,
      'Second project',
      `listen-${randomUUID().slice(0, 12)}`,
      'public'
    );
    createListenItem(project.id, user.id, item('Doomed'));

    expect(deleteProjectOrThrow(project.id, user.id)).toBe(true);

    expect(
      db
        .prepare('SELECT 1 FROM listen_items WHERE project_id = ?')
        .get(project.id)
    ).toBeUndefined();
  });

  it('is removed with a deleted account, keeping other accounts items', () => {
    const { user, project } = setup();
    const other = findOrCreateUser(`listen-keeper-${randomUUID()}`);
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES (?, ?, 'member', ?)`
    ).run(project.id, other.id, new Date().toISOString());
    const ownedElsewhere = createProject(
      other.id,
      'Shared project',
      `listen-${randomUUID().slice(0, 12)}`,
      'public'
    );
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES (?, ?, 'member', ?)`
    ).run(ownedElsewhere.id, user.id, new Date().toISOString());
    createListenItem(ownedElsewhere.id, user.id, item('Leaving'));
    const kept = createListenItem(ownedElsewhere.id, other.id, item('Kept'));

    expect(deleteUserAccount(user.id)).toBe(true);

    expect(
      db.prepare('SELECT 1 FROM listen_items WHERE user_id = ?').get(user.id)
    ).toBeUndefined();
    expect(listListenItems(ownedElsewhere.id, other.id)).toEqual([kept]);
  });
});
