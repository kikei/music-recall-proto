import { Hono } from 'hono';
import type { AppEnv } from '../auth/require-user.js';
import {
  createProject,
  getProjectForMember,
  listProjects,
  updateProject,
} from '../db/projects.js';
import { deleteProjectOrThrow } from '../projects/delete-project.js';
import { DEFAULT_CARD_VISIBILITY } from '../cards/visibility.js';
import { projectToClient } from '../projects/to-client.js';
import { INVALID_JSON_MESSAGE, readJsonObject } from './json-body.js';

export const projects = new Hono<AppEnv>();

projects.get('/', c =>
  c.json(listProjects(c.get('userId')).map(projectToClient))
);

projects.post('/', async c => {
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  if (typeof body.name !== 'string' || typeof body.slug !== 'string') {
    return c.json({ error: 'プロジェクトの入力形式が正しくありません。' }, 400);
  }
  const project = createProject(
    c.get('userId'),
    body.name,
    body.slug,
    body.defaultVisibility === undefined
      ? DEFAULT_CARD_VISIBILITY
      : body.defaultVisibility
  );
  return c.json(projectToClient(project), 201);
});

projects.patch('/:slug', async c => {
  const current = getProjectForMember(c.req.param('slug'), c.get('userId'));
  if (!current) return c.json({ error: 'not found' }, 404);
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  if (
    (body.name !== undefined && typeof body.name !== 'string') ||
    (body.slug !== undefined && typeof body.slug !== 'string')
  ) {
    return c.json({ error: 'プロジェクト設定の形式が正しくありません。' }, 400);
  }
  const project = updateProject(current.id, c.get('userId'), {
    name: typeof body.name === 'string' ? body.name : undefined,
    slug: typeof body.slug === 'string' ? body.slug : undefined,
    defaultVisibility: body.defaultVisibility,
  });
  return project
    ? c.json(projectToClient(project))
    : c.json({ error: 'not found' }, 404);
});

projects.delete('/:slug', c => {
  const userId = c.get('userId');
  const current = getProjectForMember(c.req.param('slug'), userId);
  if (!current) return c.json({ error: 'not found' }, 404);
  if (!deleteProjectOrThrow(current.id, userId)) {
    return c.json({ error: 'not found' }, 404);
  }
  return c.json(listProjects(userId).map(projectToClient));
});
