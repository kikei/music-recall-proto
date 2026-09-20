import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../auth/require-user.js';
import { getProjectForMember, type ProjectWithRole } from '../db/projects.js';

export type ProjectRouteEnv = {
  Variables: AppEnv['Variables'] & { project: ProjectWithRole };
};

export const requireProjectMember: MiddlewareHandler<ProjectRouteEnv> = async (
  c,
  next
) => {
  const project = getProjectForMember(
    c.req.param('projectSlug'),
    c.get('userId')
  );
  if (!project) return c.json({ error: 'not found' }, 404);
  c.set('project', project);
  await next();
};
