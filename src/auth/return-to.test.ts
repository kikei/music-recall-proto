import { afterEach, describe, expect, it, vi } from 'vitest';

const RETURN_TO_KEY = 'music-recall:return-to';

function storageWith(saved: string | null) {
  const values = new Map<string, string>();
  if (saved !== null) values.set(RETURN_TO_KEY, saved);
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('sign-in return destination', () => {
  it('remembers the complete current path', async () => {
    const storage = storageWith(null);
    vi.stubGlobal('sessionStorage', storage);
    vi.stubGlobal('window', {
      location: {
        pathname: '/p/demo/c/card-1',
        search: '?from=recall',
        hash: '#player',
      },
    });
    const { rememberCurrentPage } = await import('./return-to.js');

    rememberCurrentPage();

    expect(storage.setItem).toHaveBeenCalledWith(
      RETURN_TO_KEY,
      '/p/demo/c/card-1?from=recall#player'
    );
  });

  it.each([
    ['//other.example/path', '/'],
    ['/callback', '/'],
    ['/callback?code=secret', '/'],
    ['https://other.example/path', '/'],
    [null, '/'],
  ])('rejects unsafe saved path %s', async (saved, expected) => {
    vi.stubGlobal('sessionStorage', storageWith(saved));
    const { returnToPage } = await import('./return-to.js');

    expect(returnToPage()).toBe(expected);
  });

  it('consumes a valid path once and reuses it', async () => {
    const storage = storageWith('/p/demo/c/card-1?from=recall');
    vi.stubGlobal('sessionStorage', storage);
    const { returnToPage } = await import('./return-to.js');

    expect(returnToPage()).toBe('/p/demo/c/card-1?from=recall');
    expect(storage.removeItem).toHaveBeenCalledWith(RETURN_TO_KEY);
    expect(returnToPage()).toBe('/p/demo/c/card-1?from=recall');
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });
});
