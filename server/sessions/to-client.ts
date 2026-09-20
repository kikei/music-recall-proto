import type { Session } from '../db/sessions.js';
import { parsePlayerJson } from '../player/parse-json.js';

// Shape a DB session for the client: drop the internal base card link and
// expand the player from JSON into an object.
export function sessionToClient(session: Session, projectSlug: string) {
  return {
    id: session.public_id,
    projectSlug,
    title: session.title,
    artist: session.artist,
    status: session.status,
    player: parsePlayerJson(session.player),
    metadata: session.metadata,
    created_at: session.created_at,
  };
}
