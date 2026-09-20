import { randomUUID } from 'node:crypto';
import { db } from './open.js';
import { deleteProjectData } from './project-deletion.js';
import { generatePublicId } from '../ids/public-id.js';
import { checkProjectName, checkProjectSlug } from '../projects/validation.js';
import { withProjectSlugConflict } from '../projects/slug-conflict.js';
import {
  checkVisibility,
  DEFAULT_CARD_VISIBILITY,
  type CardVisibility,
} from '../cards/visibility.js';

export type ProjectRole = 'owner' | 'member';

export interface Project {
  id: string;
  slug: string;
  name: string;
  default_card_visibility: CardVisibility;
  created_at: string;
}

export interface ProjectWithRole extends Project {
  role: ProjectRole;
}

export function ensurePersonalProject(userId: string): ProjectWithRole {
  const existing = listProjects(userId)[0];
  if (existing) return existing;
  return createProject(
    userId,
    '音楽想起エンジン',
    uniqueProjectSlug(),
    DEFAULT_CARD_VISIBILITY
  );
}

export function createProject(
  userId: string,
  nameInput: string,
  slugInput: string,
  defaultVisibility: unknown
): ProjectWithRole {
  const project: Project = {
    id: randomUUID(),
    slug: checkProjectSlug(slugInput),
    name: checkProjectName(nameInput),
    default_card_visibility: checkVisibility(defaultVisibility),
    created_at: new Date().toISOString(),
  };
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO projects
         (id, slug, name, default_card_visibility, created_at)
       VALUES (@id, @slug, @name, @default_card_visibility, @created_at)`
    ).run(project);
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, joined_at)
       VALUES (?, ?, 'owner', ?)`
    ).run(project.id, userId, project.created_at);
  });
  withProjectSlugConflict(() => tx());
  return { ...project, role: 'owner' };
}

export function listProjects(userId: string): ProjectWithRole[] {
  return db
    .prepare(
      `SELECT p.*, pm.role
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE pm.user_id = ?
       ORDER BY p.created_at ASC`
    )
    .all(userId) as ProjectWithRole[];
}

export function getProjectBySlug(slug: string): Project | undefined {
  return db.prepare('SELECT * FROM projects WHERE slug = ?').get(slug) as
    | Project
    | undefined;
}

export function getProjectById(id: string): Project | undefined {
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as
    | Project
    | undefined;
}

export function getProjectForMember(
  slug: string | undefined,
  userId: string
): ProjectWithRole | undefined {
  if (!slug) return undefined;
  return db
    .prepare(
      `SELECT p.*, pm.role
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE p.slug = ? AND pm.user_id = ?`
    )
    .get(slug, userId) as ProjectWithRole | undefined;
}

export function getProjectRole(
  projectId: string,
  userId: string
): ProjectRole | undefined {
  return (
    db
      .prepare(
        'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
      )
      .get(projectId, userId) as { role: ProjectRole } | undefined
  )?.role;
}

export function updateProject(
  projectId: string,
  userId: string,
  patch: { name?: string; slug?: string; defaultVisibility?: unknown }
): ProjectWithRole | undefined {
  const current = db
    .prepare(
      `SELECT p.*, pm.role
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id
       WHERE p.id = ? AND pm.user_id = ? AND pm.role = 'owner'`
    )
    .get(projectId, userId) as ProjectWithRole | undefined;
  if (!current) return undefined;
  const requestedSlug =
    patch.slug === undefined ? current.slug : checkProjectSlug(patch.slug);
  const next = {
    name:
      patch.name === undefined ? current.name : checkProjectName(patch.name),
    slug: requestedSlug,
    default_card_visibility:
      patch.defaultVisibility === undefined
        ? current.default_card_visibility
        : checkVisibility(patch.defaultVisibility),
  };
  withProjectSlugConflict(() => {
    db.prepare(
      `UPDATE projects SET name = @name, slug = @slug,
         default_card_visibility = @default_card_visibility
       WHERE id = @id`
    ).run({ id: projectId, ...next });
  });
  return { ...current, ...next };
}

export type DeleteProjectResult = 'deleted' | 'not-found' | 'last-project';

export function tryDeleteOwnedProject(
  projectId: string,
  userId: string
): DeleteProjectResult {
  const owned = db
    .prepare(
      `SELECT 1 FROM project_members
       WHERE project_id = ? AND user_id = ? AND role = 'owner'`
    )
    .get(projectId, userId);
  if (!owned) return 'not-found';
  const projectCount = (
    db
      .prepare(
        'SELECT COUNT(*) AS count FROM project_members WHERE user_id = ?'
      )
      .get(userId) as { count: number }
  ).count;
  if (projectCount <= 1) return 'last-project';

  const remove = db.transaction(() => deleteProjectData(projectId));
  return remove() ? 'deleted' : 'not-found';
}

function uniqueProjectSlug(): string {
  for (;;) {
    const slug = `music-${generatePublicId()}`;
    if (!getProjectBySlug(slug)) return slug;
  }
}
