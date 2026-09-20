import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { AppEnv } from '../auth/require-user.js';
import { createCard, type NewCard } from '../db/cards.js';
import { addMessage } from '../db/messages.js';
import { createProject } from '../db/projects.js';
import { createSession } from '../db/sessions.js';
import { findOrCreateUser } from '../db/users.js';
import { cards } from './cards.js';
import { recallRoute } from './recall.js';
import { sessions } from './sessions.js';

// Recall depends on the LLM only for the cue expansion, the embedding and the
// rerank. Replace those three so the tests pin the shape of the responses the
// client receives without any network call.
vi.mock('../llm/expand.js', () => ({
  expandCue: vi.fn(async () => ''),
}));
vi.mock('../llm/embed.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../llm/embed.js')>()),
  embed: vi.fn(async () => [1, 0, 0]),
}));
vi.mock('../llm/rank.js', async importOriginal => ({
  ...(await importOriginal<typeof import('../llm/rank.js')>()),
  rankRecall: vi.fn(async (_query: string, candidates: { id: string }[]) =>
    candidates.map((candidate, index) => ({
      id: candidate.id,
      relevance: 1 - index / 10,
      reason: 'Test reason',
    }))
  ),
}));

function cardInput(
  projectId: string,
  userId: string,
  title: string,
  embedding: number[]
): NewCard {
  return {
    project_id: projectId,
    created_by_user_id: userId,
    visibility: 'public',
    session_id: null,
    title,
    artist: 'Test artist',
    hook: `${title} hook`,
    recall_phrase: `${title} cue`,
    background: `${title} background`,
    metadata: null,
    embedding,
  };
}

function setup() {
  const user = findOrCreateUser(`recall-response-${randomUUID()}`);
  const project = createProject(
    user.id,
    'Recall response project',
    `recall-${randomUUID().slice(0, 12)}`,
    'public'
  );
  const first = createCard(
    cardInput(project.id, user.id, 'First record', [1, 0, 0])
  );
  const second = createCard(
    cardInput(project.id, user.id, 'Second record', [0.9, 0.1, 0])
  );
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('userId', user.id);
    await next();
  });
  app.route('/api/projects/:projectSlug/recall', recallRoute);
  app.route('/api/projects/:projectSlug/cards', cards);
  app.route('/api/projects/:projectSlug/sessions', sessions);
  return { app, user, project, first, second };
}

function post(app: Hono<AppEnv>, path: string, body: unknown) {
  return app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function recallResult(
  card: { public_id: string; title: string },
  projectSlug: string,
  relevance: number
) {
  return {
    id: card.public_id,
    projectSlug,
    title: card.title,
    artist: 'Test artist',
    hook: `${card.title} hook`,
    recall_phrase: `${card.title} cue`,
    background: `${card.title} background`,
    relevance,
    reason: 'Test reason',
    recall_count: 0,
    player: null,
  };
}

describe('recall responses', () => {
  it('returns recall results with the project slug for building links', async () => {
    const { app, project, first, second } = setup();

    const response = await post(app, `/api/projects/${project.slug}/recall`, {
      query: 'a quiet night',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      recallResult(first, project.slug, 1),
      recallResult(second, project.slug, 0.9),
    ]);
  });

  it('returns results for a card without including the card itself', async () => {
    const { app, project, first, second } = setup();

    const response = await post(
      app,
      `/api/projects/${project.slug}/cards/${first.public_id}/recall`,
      {}
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      recallResult(second, project.slug, 1),
    ]);
  });

  it('returns related cards in the client card shape', async () => {
    const { app, user, project, first, second } = setup();
    const session = createSession(
      user.id,
      project.id,
      'Session record',
      'Test artist',
      '',
      null,
      null
    );
    addMessage(session.id, 'user', 'Something quiet and slow');

    const response = await post(
      app,
      `/api/projects/${project.slug}/sessions/${session.public_id}/related`,
      {}
    );
    const body = (await response.json()) as Record<string, unknown>[];

    expect(response.status).toBe(200);
    expect(body.map(card => card.id)).toEqual([
      first.public_id,
      second.public_id,
    ]);
    expect(body[0]).toMatchObject({
      id: first.public_id,
      projectSlug: project.slug,
      title: 'First record',
      canEdit: true,
      visibility: 'public',
    });
    expect(body[0]).not.toHaveProperty('embedding');
  });
});
