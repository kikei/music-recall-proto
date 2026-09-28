import type { ListenItem } from '../api/listen-list.js';
import { playerToUrl } from '../api/players.js';

// What to show for an item. A link that did not resolve has no title, so the
// link itself stands in for it rather than leaving a blank row.
export function listenItemLabel(item: ListenItem): {
  title: string;
  artist: string;
} {
  return {
    title: item.title || playerToUrl(item.player),
    artist: item.artist,
  };
}
