import type { ListenItem } from '../db/listen-items.js';
import { parsePlayerJson } from '../player/parse-json.js';

// Shape a DB item for the client: expose the public id and expand the player
// from JSON into an object.
export function listenItemToClient(item: ListenItem) {
  return {
    id: item.public_id,
    title: item.title,
    artist: item.artist,
    player: parsePlayerJson(item.player),
    created_at: item.created_at,
  };
}
