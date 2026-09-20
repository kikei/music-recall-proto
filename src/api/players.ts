import { request } from './http.js';

export type Player =
  | { provider: 'spotify'; kind: 'album' | 'track' | 'playlist'; id: string }
  | { provider: 'youtube'; id: string }
  | { provider: 'niconico'; id: string }
  | {
      provider: 'apple';
      storefront: string;
      kind: 'album' | 'song' | 'playlist';
      id: string;
      track?: string;
    };

export interface PlayerMeta {
  title: string;
  artist: string;
  // Whether "album" is a meaningful, separate field (true: the link is a
  // track with its own parent album), redundant with the title (false: the
  // link is the album itself), or not applicable (null: e.g. a playlist).
  trackLevel: boolean | null;
  album?: string;
  released?: string;
  label?: string;
}

// Turn a stored player back into a URL for editing.
export function playerToUrl(player: Player | null): string {
  if (!player) return '';
  if (player.provider === 'spotify') {
    return `https://open.spotify.com/${player.kind}/${player.id}`;
  }
  if (player.provider === 'youtube') {
    return `https://www.youtube.com/watch?v=${player.id}`;
  }
  if (player.provider === 'apple') {
    const path = `${player.storefront}/${player.kind}/_/${player.id}`;
    const query =
      player.kind === 'album' && player.track ? `?i=${player.track}` : '';
    return `https://music.apple.com/${path}${query}`;
  }
  return `https://www.nicovideo.jp/watch/${player.id}`;
}

// Get title/artist and any extra reference metadata from a pasted player
// URL (for the start form's auto-fill and its metadata preview).
export function lookupPlayer(url: string): Promise<PlayerMeta> {
  return request(`/api/player/lookup?url=${encodeURIComponent(url)}`);
}
