import type { ProjectWithRole } from '../db/projects.js';

export function projectToClient(project: ProjectWithRole) {
  return {
    slug: project.slug,
    name: project.name,
    defaultVisibility: project.default_card_visibility,
    role: project.role,
  };
}
