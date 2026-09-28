import {
  resolvePastedMetadata,
  type PastedLookup,
} from '../cards/resolve-pasted-metadata.js';
import {
  createListenItem,
  findListenItemByPlayer,
  findListenItemByTitle,
  type ListenItem,
} from '../db/listen-items.js';
import { parsePlayerUrl } from '../player/parse-url.js';
import type { Player } from '../player/provider.js';
import { RequestValidationError } from '../request-validation.js';

export const MAX_LISTEN_TEXT_LENGTH = 300;

// Whether the item returned was already there (duplicate: true) or was just
// created. The caller (the client, ultimately) cannot tell these apart by
// comparing the item against what it already has locally -- its own list may
// simply not have loaded that item yet -- so the server says outright.
export interface AddListenItemResult {
  item: ListenItem;
  duplicate: boolean;
}

// Add whatever was pasted or typed: a link to a supported player, or plain
// text taken as the title. Adding is meant to be quick and rough, so a link
// that cannot be resolved into a title is still kept.
export async function addListenItem(
  projectId: string,
  userId: string,
  input: string
): Promise<AddListenItemResult> {
  const text = input.trim();
  if (!text) {
    throw new RequestValidationError('聴きたい曲を入力してください。');
  }
  if (text.length > MAX_LISTEN_TEXT_LENGTH) {
    throw new RequestValidationError(
      `${MAX_LISTEN_TEXT_LENGTH} 文字以内で入力してください。`
    );
  }
  if (!/^https?:\/\//i.test(text)) {
    // Adding the same text twice is a no-op, the same way a repeated link
    // is below: the existing entry is enough of a sign that it is already
    // there, without an error interrupting the "just add it" flow.
    const existing = findListenItemByTitle(projectId, userId, text);
    if (existing) return { item: existing, duplicate: true };
    const item = createListenItem(projectId, userId, {
      title: text,
      artist: '',
      player: null,
    });
    return { item, duplicate: false };
  }

  const player = parsePlayerUrl(text);
  if (!player) {
    throw new RequestValidationError('対応していない視聴 URL です。');
  }
  const stored = JSON.stringify(player);
  const existing = findListenItemByPlayer(projectId, userId, stored);
  if (existing) return { item: existing, duplicate: true };

  const lookup = await lookupOrNull(player);
  // The lookup is the only await in this path, so it is the only place
  // another request for the same link could finish first (within this one
  // server process; a second process would need a database constraint,
  // which a single-process deployment does not have). Checking again right
  // before the insert, with nothing async in between, closes that window.
  const raced = findListenItemByPlayer(projectId, userId, stored);
  if (raced) return { item: raced, duplicate: true };
  const item = createListenItem(projectId, userId, {
    title: lookup?.title ?? '',
    artist: lookup?.artist ?? '',
    player: stored,
  });
  return { item, duplicate: false };
}

// The lookup only decorates the entry with a name, and the streaming services
// can be slow or unavailable. Keep the entry rather than lose a song that was
// just heard.
async function lookupOrNull(player: Player): Promise<PastedLookup | null> {
  try {
    return await resolvePastedMetadata(player);
  } catch {
    return null;
  }
}
