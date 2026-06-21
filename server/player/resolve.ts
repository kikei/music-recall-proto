import type { Player } from './provider.js';
import {
  spotifyConfigured,
  spotifySearch,
  type SpotifyCandidate,
} from './spotify.js';
import { youtubeConfigured, youtubeSearch, youtubeLookup } from './youtube.js';

// Normalize a string minimally (lowercase, drop symbols/whitespace diffs).
// No similarity score; only normalized containment is checked.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

// Treat as a match if either contains the other (absorbs symbol/paren diffs).
function looselyMatches(candidate: string, want: string): boolean {
  const a = normalize(candidate);
  const b = normalize(want);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

// Whether any candidate matches the artist name.
function artistMatches(candidates: string[], artist: string): boolean {
  return candidates.some(c => looselyMatches(c, artist));
}

// Resolution at card creation: search the dedicated APIs and accept only
// candidates whose artist and title match. Spotify first; null if unsure.
export async function resolvePlayer(
  title: string,
  artist: string
): Promise<Player | null> {
  const spotify = await resolveSpotify(title, artist);
  if (spotify) return spotify;
  return resolveYouTube(title, artist);
}

// Spotify: prefer an album, fall back to a track.
async function resolveSpotify(
  title: string,
  artist: string
): Promise<Player | null> {
  if (!spotifyConfigured()) return null;
  const candidates = await spotifySearch(title, artist);
  const matches = (kind: 'album' | 'track') => (c: SpotifyCandidate) =>
    c.kind === kind &&
    artistMatches(c.artistNames, artist) &&
    looselyMatches(c.name, title);

  const album = candidates.find(matches('album'));
  if (album) return { provider: 'spotify', kind: 'album', id: album.id };
  const track = candidates.find(matches('track'));
  if (track) return { provider: 'spotify', kind: 'track', id: track.id };
  return null;
}

// YouTube: take the first embeddable video that matches the title and looks
// like the artist (channel name or video title).
async function resolveYouTube(
  title: string,
  artist: string
): Promise<Player | null> {
  if (!youtubeConfigured()) return null;
  const candidates = await youtubeSearch(title, artist);
  for (const c of candidates) {
    if (!looselyMatches(c.title, title)) continue;
    if (!artistMatches([c.channelTitle, c.title], artist)) continue;
    if (await youtubeLookup(c.id)) {
      return { provider: 'youtube', id: c.id };
    }
  }
  return null;
}

// Whether any provider's API is configured. When none is, we cannot search,
// so resolution is left unsettled and can be retried after keys are added.
export function playerConfigured(): boolean {
  return spotifyConfigured() || youtubeConfigured();
}
