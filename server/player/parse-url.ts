import type { Player } from './provider.js';

// Parse a Spotify / YouTube / Niconico URL into provider/kind/id.
// Returns null for unknown domains or shapes. Purely syntactic, no scoring.

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
    // Accept shapes like /track/ID and /intl-ja/track/ID.
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

  // Niconico. Accept watch/ID (www/sp/embed) and the short URL nico.ms/ID.
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
