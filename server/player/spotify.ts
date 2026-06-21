// Use Spotify via the Client Credentials flow (no user login).
// Used to search for works (gather candidates) and verify existence by id.

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString(
        'base64'
      )}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return cached.token;
}

export function spotifyConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export interface SpotifyMeta {
  name: string;
  artistNames: string[];
}

// Verify existence by id and return name and artists. Null if not found.
export async function spotifyLookup(
  kind: 'album' | 'track' | 'playlist',
  id: string
): Promise<SpotifyMeta | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch(`https://api.spotify.com/v1/${kind}s/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    name?: string;
    artists?: { name: string }[];
  };
  if (!json.name) return null;
  return {
    name: json.name,
    artistNames: (json.artists ?? []).map(a => a.name),
  };
}

export interface SpotifyCandidate {
  kind: 'album' | 'track';
  id: string;
  name: string;
  artistNames: string[];
}

interface SpotifyItem {
  id: string;
  name: string;
  artists?: { name: string }[];
}

// Search for a work and return album/track candidates (Search API).
// Relevance checks (artist/title match) are done by the caller.
export async function spotifySearch(
  title: string,
  artist: string
): Promise<SpotifyCandidate[]> {
  const token = await getToken();
  if (!token) return [];
  const q = encodeURIComponent(`${title} ${artist}`);
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${q}&type=album,track&limit=10`,
    { headers: { authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    albums?: { items?: SpotifyItem[] };
    tracks?: { items?: SpotifyItem[] };
  };
  return [
    ...(json.albums?.items ?? []).map(i => toCandidate('album', i)),
    ...(json.tracks?.items ?? []).map(i => toCandidate('track', i)),
  ];
}

function toCandidate(
  kind: 'album' | 'track',
  item: SpotifyItem
): SpotifyCandidate {
  return {
    kind,
    id: item.id,
    name: item.name,
    artistNames: (item.artists ?? []).map(a => a.name),
  };
}
