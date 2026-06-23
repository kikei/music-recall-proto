// Look up Apple Music title/artist via the public iTunes Lookup API.
// No API key needed. Album/track/song ids resolve; playlists (pl.*) do not.

export interface AppleMeta {
  title: string;
  artist: string;
}

interface LookupResult {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
}

// Apple appends a release-type suffix to single/EP names (e.g.
// "Paranoid Android - Single"). Strip it so the title is just the work.
function stripReleaseSuffix(title: string): string {
  return title.replace(/\s*-\s*(Single|EP)$/i, '');
}

// Resolve a single id in the given storefront (country). For a track the id is
// the track id (the `i` parameter); for an album it is the collection id.
export async function appleLookup(
  storefront: string,
  id: string
): Promise<AppleMeta | null> {
  const country = storefront || 'us';
  const res = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}` +
      `&country=${encodeURIComponent(country)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: LookupResult[] };
  const r = data.results?.[0];
  if (!r) return null;
  const title = r.trackName || r.collectionName;
  const artist = r.artistName;
  if (!title || !artist) return null;
  return { title: stripReleaseSuffix(title), artist };
}
