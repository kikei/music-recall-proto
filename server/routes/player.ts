import { Hono } from 'hono';
import { parsePlayerUrl } from '../player/parse-url.js';
import {
  resolvePastedMetadata,
  isTrackLevelPlayer,
} from '../cards/resolve-pasted-metadata.js';

export const player = new Hono();

// Look up title/artist and any extra reference metadata (album/release
// date/label) from a pasted URL, for the start form's auto-fill and its
// metadata preview. trackLevel tells the form whether an "album" field is
// meaningful (true), redundant with the title (false), or not applicable
// (null, e.g. a playlist).
player.get('/lookup', async c => {
  const parsed = parsePlayerUrl(c.req.query('url') ?? null);
  if (!parsed) return c.json({ error: '対応していない URL です' }, 400);
  const meta = await resolvePastedMetadata(parsed);
  if (!meta) {
    return c.json({ error: 'メタデータを取得できませんでした' }, 404);
  }
  return c.json({
    title: meta.title,
    artist: meta.artist,
    trackLevel: isTrackLevelPlayer(parsed),
    album: meta.extras.album,
    released: meta.extras.released,
    label: meta.extras.label,
  });
});
