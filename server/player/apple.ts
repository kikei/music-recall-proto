// Look up Apple Music title/artist via the public iTunes Lookup API.
// No API key needed. Album/track/song ids resolve; playlists (pl.*) do not.

export interface AppleMeta {
  title: string;
  artist: string;
  albumName?: string;
  trackName?: string; // only set when a specific track/song was resolved
  releaseDate?: string;
  label?: string; // best-effort, parsed out of the copyright line
}

interface LookupResult {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  releaseDate?: string;
  copyright?: string;
}

// The copyright line reads like "℗ 1997 XL Recordings Ltd." Strip the
// leading ℗/© mark and year, keeping whatever names the label. Best-effort:
// returns undefined rather than a guess when the shape doesn't match.
function labelFromCopyright(copyright: string | undefined): string | undefined {
  const m = copyright?.match(/^[℗©]\s*\d{4}\s+(.+)$/);
  return m?.[1].trim() || undefined;
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
  return {
    title: stripReleaseSuffix(title),
    artist,
    albumName: r.collectionName
      ? stripReleaseSuffix(r.collectionName)
      : undefined,
    trackName: r.trackName ? stripReleaseSuffix(r.trackName) : undefined,
    releaseDate: r.releaseDate,
    label: labelFromCopyright(r.copyright),
  };
}
