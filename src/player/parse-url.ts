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

  return null;
}
