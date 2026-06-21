import type { Player } from './provider.js';
import { spotifyLookup } from './spotify.js';
import { youtubeLookup } from './youtube.js';
import { niconicoLookup } from './niconico.js';

export interface PlayerMeta {
  title: string;
  artist: string;
}

// Look up the work title and artist from a pasted player URL.
// Used to fill in omitted title/artist. Returns null if unavailable.
export async function describePlayer(
  player: Player
): Promise<PlayerMeta | null> {
  if (player.provider === 'spotify') {
    const meta = await spotifyLookup(player.kind, player.id);
    if (!meta) return null;
    return { title: meta.name, artist: meta.artistNames.join(', ') };
  }
  if (player.provider === 'niconico') {
    const meta = await niconicoLookup(player.id);
    if (!meta) return null;
    return { title: meta.title, artist: meta.author };
  }
  const meta = await youtubeLookup(player.id);
  if (!meta) return null;
  return { title: meta.title, artist: meta.channelTitle };
}
