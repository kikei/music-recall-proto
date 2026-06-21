import type { Card } from '../db/cards.js';
import { parsePlayerJson } from '../player/parse-json.js';

// Shape a DB card for the client. Drop internal fields (embedding, resolved
// flag) and expand player from JSON into an object.
export function cardToClient(card: Card) {
  const {
    embedding: _embedding,
    player_resolved: _resolved,
    player,
    ...rest
  } = card;
  return { ...rest, player: parsePlayerJson(player) };
}
