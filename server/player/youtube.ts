// Search videos via the YouTube Data API v3 and check existence/embeddability.

export function youtubeConfigured(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}

export interface YouTubeMeta {
  title: string;
  channelTitle: string;
}

// Return info if the videoId exists and is embeddable, otherwise null.
export async function youtubeLookup(id: string): Promise<YouTubeMeta | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,status` +
      `&id=${encodeURIComponent(id)}&key=${key}`
  );
  if (!res.ok) return null;
  const json = (await res.json()) as {
    items?: {
      snippet?: { title?: string; channelTitle?: string };
      status?: { embeddable?: boolean };
    }[];
  };
  const item = json.items?.[0];
  if (!item || item.status?.embeddable === false) return null;
  return {
    title: item.snippet?.title ?? '',
    channelTitle: item.snippet?.channelTitle ?? '',
  };
}

export interface YouTubeCandidate {
  id: string;
  title: string;
  channelTitle: string;
}

// Search for a work and return video candidates (Search API).
// Embeddability is verified separately via lookup.
export async function youtubeSearch(
  title: string,
  artist: string
): Promise<YouTubeCandidate[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const q = encodeURIComponent(`${title} ${artist}`);
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet` +
      `&type=video&videoEmbeddable=true&maxResults=5&q=${q}&key=${key}`
  );
  if (!res.ok) return [];
  const json = (await res.json()) as {
    items?: {
      id?: { videoId?: string };
      snippet?: { title?: string; channelTitle?: string };
    }[];
  };
  return (json.items ?? [])
    .filter(i => i.id?.videoId)
    .map(i => ({
      id: i.id!.videoId!,
      title: i.snippet?.title ?? '',
      channelTitle: i.snippet?.channelTitle ?? '',
    }));
}
