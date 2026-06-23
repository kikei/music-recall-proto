export interface Session {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  status: string;
  player: Player | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export type Player =
  | { provider: 'spotify'; kind: 'album' | 'track' | 'playlist'; id: string }
  | { provider: 'youtube'; id: string }
  | { provider: 'niconico'; id: string }
  | {
      provider: 'apple';
      storefront: string;
      kind: 'album' | 'song' | 'playlist';
      id: string;
      track?: string;
    };

export interface Card {
  id: string;
  session_id: string | null;
  title: string;
  artist: string;
  album: string | null;
  hook: string;
  recall_phrase: string;
  background: string;
  created_at: string;
  updated_at: string;
  recall_count: number;
  player: Player | null;
}

export interface RecallResult {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  hook: string;
  recall_phrase: string;
  background: string;
  relevance: number;
  reason: string;
  recall_count: number;
  player: Player | null;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `リクエストに失敗しました (${res.status})`);
  }
  return data as T;
}

export function createSession(
  title: string,
  artist: string,
  memo: string,
  options?: { continueFromCardId?: string; playerUrl?: string }
): Promise<{ session: Session; messages: ChatMessage[] }> {
  return request('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      title,
      artist,
      memo,
      continueFromCardId: options?.continueFromCardId,
      playerUrl: options?.playerUrl,
    }),
  });
}

export function sendFragment(
  sessionId: string,
  content: string
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  return request(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, mode: 'comment' }),
  });
}

// "research": always run a web search. Body is optional (empty investigates
// the recent context).
export function research(
  sessionId: string,
  content: string
): Promise<{ user: ChatMessage | null; assistant: ChatMessage }> {
  return request(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, mode: 'research' }),
  });
}

export function makeCard(
  sessionId: string,
  finalComment?: string
): Promise<Card> {
  return request(`/api/sessions/${sessionId}/card`, {
    method: 'POST',
    body: JSON.stringify({ finalComment: finalComment ?? '' }),
  });
}

export function listCards(): Promise<Card[]> {
  return request('/api/cards');
}

export function getCard(cardId: string): Promise<Card> {
  return request(`/api/cards/${cardId}`);
}

// Increment the reference count when the detail is opened from a recall result.
export function recallHit(cardId: string): Promise<{ recall_count: number }> {
  return request(`/api/cards/${cardId}/recall-hit`, { method: 'POST' });
}

// Recall other related cards starting from this card. `direction` steers the
// recall toward a kind of music (optional).
export function recallFromCard(
  cardId: string,
  direction?: string
): Promise<RecallResult[]> {
  return request(`/api/cards/${cardId}/recall`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  });
}

export interface CardPatch {
  hook?: string;
  recall_phrase?: string;
  background?: string;
  playerUrl?: string; // empty string removes the player
}

// Edit a card from the detail view. On text changes the server recomputes the
// embedding.
export function editCard(cardId: string, patch: CardPatch): Promise<Card> {
  return request(`/api/cards/${cardId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

// Delete a card (its source session and messages are removed too).
export function deleteCard(cardId: string): Promise<{ ok: true }> {
  return request(`/api/cards/${cardId}`, { method: 'DELETE' });
}

// Turn a stored player back into a URL for editing.
export function playerToUrl(player: Player | null): string {
  if (!player) return '';
  if (player.provider === 'spotify') {
    return `https://open.spotify.com/${player.kind}/${player.id}`;
  }
  if (player.provider === 'youtube') {
    return `https://www.youtube.com/watch?v=${player.id}`;
  }
  if (player.provider === 'apple') {
    const path = `${player.storefront}/${player.kind}/_/${player.id}`;
    const query =
      player.kind === 'album' && player.track ? `?i=${player.track}` : '';
    return `https://music.apple.com/${path}${query}`;
  }
  return `https://www.nicovideo.jp/watch/${player.id}`;
}

// The card's source session messages (view only).
export function getCardTranscript(cardId: string): Promise<ChatMessage[]> {
  return request(`/api/cards/${cardId}/transcript`);
}

export interface PlayerMeta {
  title: string;
  artist: string;
}

// Get the title and artist from a pasted player URL (for the start form).
export function lookupPlayer(url: string): Promise<PlayerMeta> {
  return request(`/api/player/lookup?url=${encodeURIComponent(url)}`);
}

export function recall(query: string): Promise<RecallResult[]> {
  return request('/api/recall', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

// Open (active) sessions for the workspace sidebar.
export function listActiveSessions(): Promise<Session[]> {
  return request('/api/sessions');
}

// Load a session with its messages, to foreground or resume it.
export function getSession(
  sessionId: string
): Promise<{ session: Session; messages: ChatMessage[] }> {
  return request(`/api/sessions/${sessionId}`);
}

// Discard an open session from the workspace.
export function deleteSession(sessionId: string): Promise<{ ok: true }> {
  return request(`/api/sessions/${sessionId}`, { method: 'DELETE' });
}

// Ambient recall for the current conversation: related cards with no reason
// text. Runs after each Co-listener turn.
export function relatedToSession(sessionId: string): Promise<Card[]> {
  return request(`/api/sessions/${sessionId}/related`, { method: 'POST' });
}
