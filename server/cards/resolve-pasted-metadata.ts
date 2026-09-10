import type { Player } from '../player/provider.js';
import { spotifyLookup } from '../player/spotify.js';
import { appleLookup } from '../player/apple.js';
import { youtubeLookup } from '../player/youtube.js';
import { niconicoLookup } from '../player/niconico.js';
import {
  fillMetadataTemplate,
  type LookupMetadataKey,
} from './metadata-template.js';

// Whether a pasted player identifies a single track (Track: in the metadata
// template) as opposed to a whole work like an album (Album:). Null when
// neither applies (a playlist isn't a single work). Derived purely from the
// parsed URL, so no lookup is needed to decide this.
export function isTrackLevelPlayer(player: Player): boolean | null {
  if (player.provider === 'spotify') {
    return player.kind === 'playlist' ? null : player.kind === 'track';
  }
  if (player.provider === 'apple') {
    if (player.kind === 'playlist') return null;
    return player.kind === 'song' || !!player.track;
  }
  return true; // youtube, niconico: a single video, no album concept
}

export interface PastedMetadataExtras {
  album?: string; // the parent album, only meaningful at track level
  released?: string;
  label?: string;
}

export interface PastedLookup {
  title: string;
  artist: string;
  extras: PastedMetadataExtras;
}

// Look up a pasted player once and derive both the work's title/artist and
// whatever extra reference metadata (album/release date/label) the response
// carries. Null if the id doesn't resolve (not found, no credentials,
// unsupported kind).
export async function resolvePastedMetadata(
  player: Player
): Promise<PastedLookup | null> {
  const trackLevel = isTrackLevelPlayer(player);
  if (player.provider === 'spotify') {
    const meta = await spotifyLookup(player.kind, player.id);
    if (!meta) return null;
    return {
      title: meta.name,
      artist: meta.artistNames.join(', '),
      extras: {
        album: trackLevel ? meta.albumName : undefined,
        released: trackLevel === null ? undefined : meta.releaseDate,
        label: trackLevel === false ? meta.label : undefined,
      },
    };
  }
  if (player.provider === 'apple') {
    // Playlists (pl.*) are not in the keyless lookup API; leave to manual
    // entry.
    if (player.kind === 'playlist') return null;
    const lookupId =
      player.kind === 'album' && player.track ? player.track : player.id;
    const meta = await appleLookup(player.storefront, lookupId);
    if (!meta) return null;
    return {
      title: meta.title,
      artist: meta.artist,
      extras: {
        album: trackLevel ? meta.albumName : undefined,
        released: meta.releaseDate?.split('T')[0],
        label: meta.label,
      },
    };
  }
  if (player.provider === 'niconico') {
    const meta = await niconicoLookup(player.id);
    if (!meta) return null;
    return {
      title: meta.title,
      artist: meta.author,
      extras: { released: meta.publishedAt?.split('T')[0] },
    };
  }
  const meta = await youtubeLookup(player.id);
  if (!meta) return null;
  return {
    title: meta.title,
    artist: meta.channelTitle,
    extras: { released: meta.publishedAt?.split('T')[0] },
  };
}

// Compose the metadata template's auto-fillable lines for a pasted link.
// `extras` may come from the account (already reviewed/edited in the start
// form) or, as a fallback, from a fresh lookup. Track/Album and Artist(s)
// are derived from the finally-decided work (not copied from the lookup),
// so editing title/artist can never leave them stale. No player or no
// extras (lookup never succeeded) leaves the seed untouched.
export function composePastedMetadata(
  seed: string,
  player: Player | null,
  work: { title: string; artist: string },
  extras: PastedMetadataExtras | undefined
): string {
  if (!player || !extras) return seed;
  const trackLevel = isTrackLevelPlayer(player);
  const values: Partial<Record<LookupMetadataKey, string>> = {
    'Artist(s)': work.artist,
    Released: extras.released || '-',
    Label: extras.label || '-',
  };
  if (trackLevel === true) {
    values.Track = work.title;
    values.Album = extras.album || '-';
  } else if (trackLevel === false) {
    values.Album = work.title;
    values.Track = '-';
  } else {
    values.Track = '-';
    values.Album = '-';
  }
  return fillMetadataTemplate(seed, values);
}
