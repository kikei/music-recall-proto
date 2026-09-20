import { describe, expect, it } from 'vitest';
import { routeFromUrl, routePath, type AppRoute } from './routing.js';

describe('app routes', () => {
  it.each<AppRoute>([
    { kind: 'root' },
    { kind: 'new', projectSlug: 'quiet-signals' },
    { kind: 'cards', projectSlug: 'quiet-signals' },
    { kind: 'account-settings', projectSlug: 'quiet-signals' },
    { kind: 'project-settings', projectSlug: 'quiet-signals' },
    { kind: 'session', projectSlug: 'quiet-signals', id: 'a-b' },
    { kind: 'card', projectSlug: 'quiet-signals', id: 'a-b' },
    { kind: 'recall', projectSlug: 'quiet-signals' },
    {
      kind: 'recall',
      projectSlug: 'quiet-signals',
      query: '夜の雨 & ピアノ',
    },
    {
      kind: 'recall',
      projectSlug: 'quiet-signals',
      cardId: 'a-b',
      direction: 'ジャズ寄り',
    },
  ])('round-trips $kind', route => {
    expect(
      routeFromUrl(new URL(routePath(route), 'https://example.test'))
    ).toEqual(route);
  });

  it('rejects unknown and malformed detail paths', () => {
    for (const path of ['/missing', '/p/demo/c/a/b', '/p/demo/s/%ZZ']) {
      expect(routeFromUrl(new URL(path, 'https://example.test'))).toEqual({
        kind: 'not-found',
      });
    }
  });

  it('does not mistake the sign-in callback for a page', () => {
    expect(
      routeFromUrl(new URL('/callback?code=secret', 'https://example.test'))
    ).toEqual({ kind: 'not-found' });
  });
});
