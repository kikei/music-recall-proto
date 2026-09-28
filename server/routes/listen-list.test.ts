import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { AppEnv } from '../auth/require-user.js';
import { createListenItem } from '../db/listen-items.js';
import { createProject } from '../db/projects.js';
import { findOrCreateUser } from '../db/users.js';
import { RequestValidationError } from '../request-validation.js';
import { listenList } from './listen-list.js';

vi.mock('../cards/resolve-pasted-metadata.js', () => ({
  resolvePastedMetadata: vi.fn(async () => ({
    title: 'Idioteque',
    artist: 'Radiohead',
    extras: {},
  })),
}));

function setup() {
  const user = findOrCreateUser(`listen-route-${randomUUID()}`);
  const project = createProject(
    user.id,
    'Listen route project',
    `route-${randomUUID().slice(0, 12)}`,
    'public'
  );
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('userId', user.id);
    await next();
  });
  app.onError((err, c) => {
    if (err instanceof RequestValidationError) {
      return c.json({ error: err.message }, 400);
    }
    throw err;
  });
  app.route('/api/projects/:projectSlug/listen-list', listenList);
  return { app, user, project };
}

describe('listen list routes', () => {
  it('lists the items in the client shape, oldest first', async () => {
    const { app, user, project } = setup();
    const first = createListenItem(project.id, user.id, {
      title: 'Kid A',
      artist: '',
      player: null,
    });
    createListenItem(project.id, user.id, {
      title: 'Second',
      artist: '',
      player: JSON.stringify({ provider: 'youtube', id: 'abc' }),
    });

    const response = await app.request(
      `/api/projects/${project.slug}/listen-list`
    );
    const body = (await response.json()) as Record<string, unknown>[];

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0]).toEqual({
      id: first.public_id,
      title: 'Kid A',
      artist: '',
      player: null,
      created_at: first.created_at,
    });
    expect(body[1]).toMatchObject({
      player: { provider: 'youtube', id: 'abc' },
    });
  });

  it('adds an item from text', async () => {
    const { app, project } = setup();

    const response = await app.request(
      `/api/projects/${project.slug}/listen-list`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: 'https://www.youtube.com/watch?v=abc',
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      title: 'Idioteque',
      artist: 'Radiohead',
      player: { provider: 'youtube', id: 'abc' },
      duplicate: false,
    });
  });

  it('reports a repeated link as a duplicate of the same item', async () => {
    const { app, project } = setup();
    const post = () =>
      app.request(`/api/projects/${project.slug}/listen-list`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: 'https://www.youtube.com/watch?v=abc',
        }),
      });

    const first = await post();
    const again = await post();
    const firstBody = (await first.json()) as { id: string };
    const againBody = (await again.json()) as {
      id: string;
      duplicate: boolean;
    };

    expect(againBody.id).toBe(firstBody.id);
    expect(againBody.duplicate).toBe(true);
  });

  it('rejects a body without text', async () => {
    const { app, project } = setup();

    const response = await app.request(
      `/api/projects/${project.slug}/listen-list`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: 5 }),
      }
    );

    expect(response.status).toBe(400);
  });

  it('deletes an item', async () => {
    const { app, user, project } = setup();
    const item = createListenItem(project.id, user.id, {
      title: 'Kid A',
      artist: '',
      player: null,
    });

    const response = await app.request(
      `/api/projects/${project.slug}/listen-list/${item.public_id}`,
      { method: 'DELETE' }
    );

    expect(response.status).toBe(200);
    const list = await app.request(`/api/projects/${project.slug}/listen-list`);
    expect(await list.json()).toEqual([]);
  });

  it('returns 404 for an item that is not the account own', async () => {
    const { app, project } = setup();

    const response = await app.request(
      `/api/projects/${project.slug}/listen-list/missing`,
      { method: 'DELETE' }
    );

    expect(response.status).toBe(404);
  });
});
