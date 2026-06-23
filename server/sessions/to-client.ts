import type { Session } from '../db/sessions.js';
import { parsePlayerJson } from '../player/parse-json.js';

// Shape a DB session for the client: drop the internal base card link and
// expand the player from JSON into an object.
export function sessionToClient(session: Session) {
  const { base_card_id: _base, player, ...rest } = session;
  return { ...rest, player: parsePlayerJson(player) };
}
