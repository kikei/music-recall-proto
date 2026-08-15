import { accessToken } from './access-token.js';
import { reportUnauthorized } from './session-expiry.js';

export interface Session {
  id: string;
  title: string;
  artist: string;
  status: string;
  player: Player | null;
  metadata: string | null;
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
  hook: string;
  recall_phrase: string;
  background: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
  recall_count: number;
  player: Player | null;
}

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
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(await authorization()),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    // A rejected or missing token is not something a screen can act on, so it
    // goes to the gate, which can offer a way back in. The error still throws
    // so the caller stops.
    if (res.status === 401) reportUnauthorized();
    throw new Error(data?.error ?? `リクエストに失敗しました (${res.status})`);
  }
  return data as T;
}

// Failing to obtain a token is treated the same as not having one: the request
// goes out unauthenticated, comes back 401, and takes the single recovery path
// above. Otherwise the provider's own error would surface on whichever screen
// happened to be open.
async function authorization(): Promise<Record<string, string>> {
  try {
    const token = await accessToken();
    return token ? { authorization: `Bearer ${token}` } : {};
  } catch (e) {
    console.warn('[auth] アクセストークンを取得できませんでした', e);
    return {};
  }
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
  title?: string;
  artist?: string;
  hook?: string;
  recall_phrase?: string;
  background?: string;
  metadata?: string;
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

// Update an open session's work (title/artist) and/or its reference metadata.
export function editSession(
  sessionId: string,
  patch: { title?: string; artist?: string; metadata?: string }
): Promise<Session> {
  return request(`/api/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
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

// Third-party API keys an account supplies. The secret is only ever sent to the
// server; what comes back is whether it is set plus a few trailing characters.
export type CredentialKind =
  | 'openai'
  | 'spotify_client_id'
  | 'spotify_client_secret'
  | 'youtube';

export interface CredentialStatus {
  kind: CredentialKind;
  configured: boolean;
  hint: string;
}

export function listCredentials(): Promise<CredentialStatus[]> {
  return request('/api/credentials');
}

export function saveCredential(
  kind: CredentialKind,
  secret: string
): Promise<CredentialStatus[]> {
  return request(`/api/credentials/${kind}`, {
    method: 'PUT',
    body: JSON.stringify({ secret }),
  });
}

export function removeCredential(
  kind: CredentialKind
): Promise<CredentialStatus[]> {
  return request(`/api/credentials/${kind}`, { method: 'DELETE' });
}

// The account as this app knows it. The identity provider keeps the real
// profile; the only name here is the one the person chose, and it is a label
// rather than an identifier -- nothing resolves or routes by it.
export interface Account {
  displayName: string | null;
}

export function getAccount(): Promise<Account> {
  return request('/api/account');
}

export function setDisplayName(displayName: string): Promise<Account> {
  return request('/api/account', {
    method: 'PATCH',
    body: JSON.stringify({ displayName }),
  });
}
