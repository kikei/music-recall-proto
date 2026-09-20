import { Hono } from 'hono';
import { recall } from '../cards/recall.js';
import { recallResultToClient } from '../cards/recall-to-client.js';
import { INVALID_JSON_MESSAGE, readJsonObject } from './json-body.js';
import {
  requireProjectMember,
  type ProjectRouteEnv,
} from './project-context.js';

export const recallRoute = new Hono<ProjectRouteEnv>();

recallRoute.use('*', requireProjectMember);

// Recall past cards from the current cue (an impression or vague words).
recallRoute.post('/', async c => {
  const project = c.get('project');
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!query) return c.json({ error: 'きっかけを入力してください' }, 400);
  const results = await recall(query, {
    projectId: project.id,
    userId: c.get('userId'),
  });
  return c.json(
    results.map(result => recallResultToClient(result, project.slug))
  );
});
