export type AppRoute =
  | { kind: 'root' }
  | { kind: 'new'; projectSlug: string }
  | { kind: 'session'; projectSlug: string; id: string }
  | { kind: 'cards'; projectSlug: string }
  | { kind: 'card'; projectSlug: string; id: string }
  | { kind: 'account-settings'; projectSlug: string }
  | { kind: 'project-settings'; projectSlug: string }
  | {
      kind: 'recall';
      projectSlug: string;
      query?: string;
      cardId?: string;
      direction?: string;
    };

export type ParsedRoute = AppRoute | { kind: 'not-found' };

export function routeFromUrl(
  url: Pick<URL, 'pathname' | 'search'>
): ParsedRoute {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return { kind: 'root' };
  const parts = path.split('/').filter(Boolean).map(decodePart);
  if (parts.some(part => part === null) || parts[0] !== 'p' || !parts[1]) {
    return { kind: 'not-found' };
  }
  const projectSlug = parts[1]!;
  if (parts.length === 2) return { kind: 'new', projectSlug };
  if (parts.length === 3 && parts[2] === 'cards') {
    return { kind: 'cards', projectSlug };
  }
  if (parts.length === 3 && parts[2] === 'account') {
    return { kind: 'account-settings', projectSlug };
  }
  if (parts.length === 3 && parts[2] === 'settings') {
    return { kind: 'project-settings', projectSlug };
  }
  if (parts.length === 3 && parts[2] === 'recall') {
    const params = new URLSearchParams(url.search);
    const cardId = params.get('card')?.trim();
    return cardId
      ? {
          kind: 'recall',
          projectSlug,
          cardId,
          direction: params.get('direction')?.trim() || undefined,
        }
      : {
          kind: 'recall',
          projectSlug,
          query: params.get('q')?.trim() || undefined,
        };
  }
  if (parts.length === 4 && parts[2] === 's' && parts[3]) {
    return { kind: 'session', projectSlug, id: parts[3] };
  }
  if (parts.length === 4 && parts[2] === 'c' && parts[3]) {
    return { kind: 'card', projectSlug, id: parts[3] };
  }
  return { kind: 'not-found' };
}

export function routePath(route: AppRoute): string {
  if (route.kind === 'root') return '/';
  const project = `/p/${encodeURIComponent(route.projectSlug)}`;
  switch (route.kind) {
    case 'new':
      return project;
    case 'session':
      return `${project}/s/${encodeURIComponent(route.id)}`;
    case 'cards':
      return `${project}/cards`;
    case 'card':
      return `${project}/c/${encodeURIComponent(route.id)}`;
    case 'account-settings':
      return `${project}/account`;
    case 'project-settings':
      return `${project}/settings`;
    case 'recall': {
      const params = new URLSearchParams();
      if (route.cardId) {
        params.set('card', route.cardId);
        if (route.direction) params.set('direction', route.direction);
      } else if (route.query) {
        params.set('q', route.query);
      }
      const query = params.toString();
      return `${project}/recall${query ? `?${query}` : ''}`;
    }
  }
}

function decodePart(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value);
    return decoded.includes('/') ? null : decoded;
  } catch {
    return null;
  }
}
