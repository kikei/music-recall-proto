import type { Card } from './cards.js';
import { projectApi, request } from './http.js';
import type { Player } from './players.js';

export interface Session {
  id: string;
  projectSlug: string;
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

export interface MetadataExtras {
  album?: string;
  released?: string;
  label?: string;
}

export function createSession(
  projectSlug: string,
  title: string,
  artist: string,
  memo: string,
  options?: {
    continueFromCardId?: string;
    playerUrl?: string;
    metadataExtras?: MetadataExtras;
  }
): Promise<{ session: Session; messages: ChatMessage[] }> {
  return request(`${projectApi(projectSlug)}/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      artist,
      memo,
      continueFromCardId: options?.continueFromCardId,
      playerUrl: options?.playerUrl,
      metadataExtras: options?.metadataExtras,
    }),
  });
}

export function sendFragment(
  projectSlug: string,
  sessionId: string,
  content: string
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  const session = encodeURIComponent(sessionId);
  return request(`${projectApi(projectSlug)}/sessions/${session}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, mode: 'comment' }),
  });
}

// "research": always run a web search. Body is optional (empty investigates
// the recent context).
export function research(
  projectSlug: string,
  sessionId: string,
  content: string
): Promise<{ user: ChatMessage | null; assistant: ChatMessage }> {
  const session = encodeURIComponent(sessionId);
  return request(`${projectApi(projectSlug)}/sessions/${session}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, mode: 'research' }),
  });
}

export function makeCard(
  projectSlug: string,
  sessionId: string,
  finalComment?: string
): Promise<Card> {
  return request(
    `${projectApi(projectSlug)}/sessions/${encodeURIComponent(sessionId)}/card`,
    {
      method: 'POST',
      body: JSON.stringify({ finalComment: finalComment ?? '' }),
    }
  );
}

// Open (active) sessions for the workspace sidebar.
export function listActiveSessions(projectSlug: string): Promise<Session[]> {
  return request(`${projectApi(projectSlug)}/sessions`);
}

// Load a session with its messages, to foreground or resume it.
export function getSession(
  projectSlug: string,
  sessionId: string
): Promise<{ session: Session; messages: ChatMessage[] }> {
  return request(
    `${projectApi(projectSlug)}/sessions/${encodeURIComponent(sessionId)}`
  );
}

// Update an open session's work (title/artist) and/or its reference metadata.
export function editSession(
  projectSlug: string,
  sessionId: string,
  patch: { title?: string; artist?: string; metadata?: string }
): Promise<Session> {
  return request(
    `${projectApi(projectSlug)}/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );
}

// Discard an open session from the workspace.
export function deleteSession(
  projectSlug: string,
  sessionId: string
): Promise<{ ok: true }> {
  return request(
    `${projectApi(projectSlug)}/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' }
  );
}

// Ghost-text example for the fragment input, seeded from the Co-listener's
// last message. null when there is no assistant message yet.
export function suggestFragment(
  projectSlug: string,
  sessionId: string
): Promise<{ suggestion: string | null }> {
  const session = encodeURIComponent(sessionId);
  return request(`${projectApi(projectSlug)}/sessions/${session}/suggest`);
}
