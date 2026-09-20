import type { Card } from './cards.js';
import { projectApi, request } from './http.js';
import type { Player } from './players.js';

export interface RecallResult {
  id: string;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
  relevance: number;
  reason: string;
  recall_count: number;
  player: Player | null;
  projectSlug: string;
}

// Increment the reference count when the detail is opened from a recall result.
export function recallHit(
  projectSlug: string,
  cardId: string
): Promise<{ recall_count: number }> {
  return request(
    `${projectApi(projectSlug)}/cards/${encodeURIComponent(cardId)}/recall-hit`,
    { method: 'POST' }
  );
}

// Recall other related cards starting from this card. `direction` steers the
// recall toward a kind of music (optional).
export function recallFromCard(
  projectSlug: string,
  cardId: string,
  direction?: string
): Promise<RecallResult[]> {
  return request(
    `${projectApi(projectSlug)}/cards/${encodeURIComponent(cardId)}/recall`,
    {
      method: 'POST',
      body: JSON.stringify({ direction }),
    }
  );
}

export function recall(
  projectSlug: string,
  query: string
): Promise<RecallResult[]> {
  return request(`${projectApi(projectSlug)}/recall`, {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

// Ambient recall for the current conversation: related cards with no reason
// text. Runs after each Co-listener turn.
export function relatedToSession(
  projectSlug: string,
  sessionId: string
): Promise<Card[]> {
  const session = encodeURIComponent(sessionId);
  return request(`${projectApi(projectSlug)}/sessions/${session}/related`, {
    method: 'POST',
  });
}
