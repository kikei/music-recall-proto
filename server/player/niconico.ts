// Fetch video info via Niconico's public getthumbinfo API.
// No API key needed. Returns the title and uploader (user or channel name).

export interface NiconicoMeta {
  title: string;
  author: string;
}

// Minimal XML entity decoding (only what appears in getthumbinfo output).
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&');
}

function tagText(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? decodeEntities(m[1].trim()) : null;
}

// Confirm a video id (sm... / nm... / so... / numeric) exists and return info.
// Returns null when not found, private, etc.
export async function niconicoLookup(id: string): Promise<NiconicoMeta | null> {
  const res = await fetch(
    `https://ext.nicovideo.jp/api/getthumbinfo/${encodeURIComponent(id)}`
  );
  if (!res.ok) return null;
  const xml = await res.text();
  // On failure the API returns <thumb_response status="fail">.
  if (/status="fail"/.test(xml)) return null;
  const title = tagText(xml, 'title');
  if (!title) return null;
  const author = tagText(xml, 'user_nickname') ?? tagText(xml, 'ch_name') ?? '';
  return { title, author };
}
