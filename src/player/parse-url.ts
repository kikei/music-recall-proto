import type { Player } from '../api/client.js';

// Parse a Spotify / YouTube / Niconico URL into provider/kind/id, mirroring the
// server parser. Purely syntactic (no API), used to preview the embed while
// filling the start form. Returns null for unknown domains or shapes.

const SPOTIFY_KINDS = new Set(['album', 'track', 'playlist']);

export function parsePlayerUrl(raw: string | undefined | null): Player | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');

  if (host === 'open.spotify.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const i = parts.findIndex(p => SPOTIFY_KINDS.has(p));
    if (i >= 0 && parts[i + 1]) {
      const kind = parts[i] as 'album' | 'track' | 'playlist';
      return { provider: 'spotify', kind, id: parts[i + 1] };
    }
    return null;
  }

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id ? { provider: 'youtube', id } : null;
  }
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const id = url.searchParams.get('v');
    return id ? { provider: 'youtube', id } : null;
  }

  if (
    host === 'nicovideo.jp' ||
    host === 'sp.nicovideo.jp' ||
    host === 'embed.nicovideo.jp'
  ) {
    const parts = url.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('watch');
    const id = i >= 0 ? parts[i + 1] : undefined;
    return id ? { provider: 'niconico', id } : null;
  }
  if (host === 'nico.ms') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id ? { provider: 'niconico', id } : null;
  }

  if (host === 'music.apple.com' || host === 'beta.music.apple.com') {
    return parseAppleUrl(url);
  }

  return null;
}

const APPLE_TYPES = new Set(['album', 'song', 'playlist']);

// Apple Music: /{storefront}/{album|song|playlist}/{slug}/{id}. A track inside
// an album page is the album URL with ?i={trackId}.
function parseAppleUrl(url: URL): Player | null {
  const parts = url.pathname.split('/').filter(Boolean);
  const ti = parts.findIndex(p => APPLE_TYPES.has(p));
  if (ti < 0) return null;
  const kind = parts[ti] as 'album' | 'song' | 'playlist';
  const storefront = ti >= 1 ? parts[ti - 1] : 'us';
  const id = parts[parts.length - 1];
  if (!id || APPLE_TYPES.has(id)) return null;
  if (kind === 'album') {
    const track = url.searchParams.get('i');
    const base = { provider: 'apple' as const, storefront, kind, id };
    return track ? { ...base, track } : base;
  }
  return { provider: 'apple', storefront, kind, id };
}
