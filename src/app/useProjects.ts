import { useEffect } from 'react';
import { listProjects, type Project } from '../api/projects.js';
import { routeFromUrl } from '../routing.js';
import type { AppNavigate } from './useAppRoute.js';

export function useProjects(
  navigate: AppNavigate,
  onProjectsLoaded: (projects: Project[]) => void,
  onError: (message: string) => void
) {
  useEffect(() => {
    listProjects()
      .then(list => {
        onProjectsLoaded(list);
        const current = routeFromUrl(window.location);
        if (current.kind === 'root' && list[0]) {
          navigate({ kind: 'new', projectSlug: list[0].slug }, true);
        }
      })
      .catch(e => {
        onError(e instanceof Error ? e.message : String(e));
        onProjectsLoaded([]);
      });
    // The initial URL is intentionally read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
