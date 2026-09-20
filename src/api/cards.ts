import { projectApi, request } from './http.js';
import type { Player } from './players.js';
import type { ChatMessage } from './sessions.js';

export interface Card {
  id: string;
  projectSlug: string;
  canEdit: boolean;
  hasTranscript: boolean;
  canDelete: boolean;
  canChangeVisibility: boolean;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  recall_count: number;
  player: Player | null;
  visibility: CardVisibility;
}

export type CardVisibility = 'private' | 'members' | 'public';

export interface PublicCard {
  id: string;
  projectSlug: string;
  projectName: string;
  title: string;
  artist: string;
  hook: string;
  recall_phrase: string;
  background: string;
  created_at: string;
  player: Player | null;
}

export interface CardPatch {
  title?: string;
  artist?: string;
  hook?: string;
  recall_phrase?: string;
  background?: string;
  metadata?: string;
  playerUrl?: string; // empty string removes the player
  visibility?: CardVisibility;
}

export async function getPublicCard(
  projectSlug: string,
  cardId: string
): Promise<PublicCard> {
  const project = encodeURIComponent(projectSlug);
  const card = encodeURIComponent(cardId);
  const res = await fetch(`/public/${project}/cards/${card}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? 'カードが見つかりません。');
  return data as PublicCard;
}

export function listCards(projectSlug: string): Promise<Card[]> {
  return request(`${projectApi(projectSlug)}/cards`);
}

export function getCard(projectSlug: string, cardId: string): Promise<Card> {
  return request(
    `${projectApi(projectSlug)}/cards/${encodeURIComponent(cardId)}`
  );
}

// Edit a card from the detail view. On text changes the server recomputes the
// embedding.
export function editCard(
  projectSlug: string,
  cardId: string,
  patch: CardPatch
): Promise<Card> {
  return request(
    `${projectApi(projectSlug)}/cards/${encodeURIComponent(cardId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );
}

// Delete a card (its source session and messages are removed too).
export function deleteCard(
  projectSlug: string,
  cardId: string
): Promise<{ ok: true }> {
  return request(
    `${projectApi(projectSlug)}/cards/${encodeURIComponent(cardId)}`,
    { method: 'DELETE' }
  );
}

// The card's source session messages (view only).
export function getCardTranscript(
  projectSlug: string,
  cardId: string
): Promise<ChatMessage[]> {
  return request(
    `${projectApi(projectSlug)}/cards/${encodeURIComponent(cardId)}/transcript`
  );
}
