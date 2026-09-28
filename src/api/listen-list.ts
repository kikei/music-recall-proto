import { projectApi, request } from './http.js';
import type { Player } from './players.js';

// A song the account wants to listen to later. title and artist are blank when
// a pasted link did not resolve, and artist is blank for a plain-text entry.
export interface ListenItem {
  id: string;
  title: string;
  artist: string;
  player: Player | null;
  created_at: string;
}

export function listListenItems(projectSlug: string): Promise<ListenItem[]> {
  return request(`${projectApi(projectSlug)}/listen-list`);
}

// `duplicate` is true when `text` (a link or its exact wording) already
// matched an item in the list, in which case the rest of the response is that
// existing item, not a new one.
export interface AddListenItemResponse extends ListenItem {
  duplicate: boolean;
}

// text is a player link or plain text.
export function addListenItem(
  projectSlug: string,
  text: string
): Promise<AddListenItemResponse> {
  return request(`${projectApi(projectSlug)}/listen-list`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function deleteListenItem(
  projectSlug: string,
  id: string
): Promise<{ ok: true }> {
  return request(
    `${projectApi(projectSlug)}/listen-list/${encodeURIComponent(id)}`,
    { method: 'DELETE' }
  );
}
