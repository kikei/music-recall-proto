import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createListenItem, listListenItems } from '../db/listen-items.js';
import { createProject } from '../db/projects.js';
import { listActiveSessions } from '../db/sessions.js';
import { findOrCreateUser } from '../db/users.js';
import { openingMessage } from '../llm/chat.js';
import { startSession } from './start.js';

// The opening message is an LLM call; the tests only care about the session.
vi.mock('../llm/chat.js', () => ({
  openingMessage: vi.fn(async () => 'Opening'),
  continueSession: vi.fn(async () => 'Continued'),
}));

function setup() {
  const user = findOrCreateUser(`start-list-${randomUUID()}`);
  const project = createProject(
    user.id,
    'Start from list project',
    `start-${randomUUID().slice(0, 12)}`,
    'public'
  );
  const item = createListenItem(project.id, user.id, {
    title: 'Kid A',
    artist: 'Radiohead',
    player: null,
  });
  return { user, project, item };
}

describe('starting a session from the listen list', () => {
  it('removes the item once the session has started', async () => {
    const { user, project, item } = setup();

    const result = await startSession(project.id, user.id, {
      title: 'Kid A',
      artist: 'Radiohead',
      listenItemId: item.public_id,
    });

    expect(result.kind).toBe('started');
    expect(listListenItems(project.id, user.id)).toEqual([]);
  });

  it('keeps the item when the session does not start', async () => {
    const { user, project, item } = setup();

    const result = await startSession(project.id, user.id, {
      listenItemId: item.public_id,
    });

    expect(result.kind).toBe('missing-work');
    expect(listListenItems(project.id, user.id)).toHaveLength(1);
  });

  it('refuses an item that does not exist, without starting a session', async () => {
    const { user, project } = setup();

    const result = await startSession(project.id, user.id, {
      title: 'Kid A',
      artist: 'Radiohead',
      listenItemId: 'missing',
    });

    expect(result.kind).toBe('listen-item-not-found');
  });

  it("refuses another account's item and leaves it in place", async () => {
    const { project, item, user } = setup();
    const other = findOrCreateUser(`start-list-other-${randomUUID()}`);

    const result = await startSession(project.id, other.id, {
      title: 'Kid A',
      artist: 'Radiohead',
      listenItemId: item.public_id,
    });

    expect(result.kind).toBe('listen-item-not-found');
    expect(listListenItems(project.id, user.id)).toHaveLength(1);
  });

  it('keeps the item and leaves no orphaned session when the opening message fails', async () => {
    const { user, project, item } = setup();
    vi.mocked(openingMessage).mockRejectedValueOnce(new Error('LLM down'));

    await expect(
      startSession(project.id, user.id, {
        title: 'Kid A',
        artist: 'Radiohead',
        listenItemId: item.public_id,
      })
    ).rejects.toThrow('LLM down');

    expect(listListenItems(project.id, user.id)).toHaveLength(1);
    expect(listActiveSessions(project.id, user.id)).toEqual([]);
  });
});
