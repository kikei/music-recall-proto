import type { CardVisibility } from './cards.js';
import { request } from './http.js';

export interface Project {
  slug: string;
  name: string;
  defaultVisibility: CardVisibility;
  role: 'owner' | 'member';
}

export function listProjects(): Promise<Project[]> {
  return request('/api/projects');
}

export function createProject(input: {
  name: string;
  slug: string;
  defaultVisibility?: CardVisibility;
}): Promise<Project> {
  return request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateProject(
  projectSlug: string,
  patch: { name?: string; slug?: string; defaultVisibility?: CardVisibility }
): Promise<Project> {
  return request(`/api/projects/${encodeURIComponent(projectSlug)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteProject(projectSlug: string): Promise<Project[]> {
  return request(`/api/projects/${encodeURIComponent(projectSlug)}`, {
    method: 'DELETE',
  });
}
