import { selectOwnBaseCard } from '../db/card-access.js';
import { getCardByPublicId } from '../db/cards.js';
import {
  deleteListenItem,
  getListenItemByPublicId,
} from '../db/listen-items.js';
import { addMessage, listMessages, type Message } from '../db/messages.js';
import { db } from '../db/open.js';
import {
  createSession,
  deleteSessionData,
  type Session,
} from '../db/sessions.js';
import { BLANK_METADATA_TEMPLATE } from '../cards/metadata-template.js';
import {
  composePastedMetadata,
  resolvePastedMetadata,
  type PastedLookup,
  type PastedMetadataExtras,
} from '../cards/resolve-pasted-metadata.js';
import { continueSession, openingMessage } from '../llm/chat.js';
import { parsePlayerUrl } from '../player/parse-url.js';

export interface StartSessionInput {
  title?: string;
  artist?: string;
  memo?: string;
  continueFromCardId?: string;
  playerUrl?: string;
  metadataExtras?: PastedMetadataExtras;
  // The listen list item this session was filled in from. It leaves the list
  // once the session exists, so an item that was only opened stays listed.
  listenItemId?: string;
}

export type StartSessionResult =
  | { kind: 'started'; session: Session; messages: Message[] }
  | { kind: 'unsupported-player-url' }
  | { kind: 'missing-work' }
  | { kind: 'base-card-not-found' }
  | { kind: 'listen-item-not-found' };

// Start a session after the route has validated the request value types.
export async function startSession(
  projectId: string,
  userId: string,
  input: StartSessionInput
): Promise<StartSessionResult> {
  // A non-empty URL is an explicit request. Reject an unsupported shape
  // instead of silently treating it as though no URL was supplied.
  const requestedPlayerUrl = input.playerUrl?.trim() ?? '';
  const pasted = parsePlayerUrl(requestedPlayerUrl || null);
  if (requestedPlayerUrl && !pasted) {
    return { kind: 'unsupported-player-url' };
  }

  // A pasted link is looked up once even when title and artist are present.
  // Its response also supplies fallback metadata when the submitted preview
  // has not resolved.
  const pastedLookup = pasted ? await resolvePastedMetadata(pasted) : null;
  const work = resolveWork(input.title, input.artist, pastedLookup);
  if (!work) return { kind: 'missing-work' };

  const baseId = input.continueFromCardId || null;
  const base = baseId
    ? getCardByPublicId(projectId, baseId, userId)
    : undefined;
  if (baseId && !base) return { kind: 'base-card-not-found' };

  const listenItem = input.listenItemId
    ? getListenItemByPublicId(projectId, input.listenItemId, userId)
    : undefined;
  if (input.listenItemId && !listenItem) {
    return { kind: 'listen-item-not-found' };
  }

  const ownBase = selectOwnBaseCard(base, userId);
  // Another creator's reference notes and conversation remain private.
  const seedMetadata = ownBase?.metadata ?? BLANK_METADATA_TEMPLATE;
  const extras = input.metadataExtras ?? pastedLookup?.extras;
  const metadata = composePastedMetadata(seedMetadata, pasted, work, extras);
  const session = createSession(
    userId,
    projectId,
    work.title,
    work.artist,
    metadata,
    base?.id ?? null,
    pasted ? JSON.stringify(pasted) : null
  );

  // The opening message is a network call to the LLM and can fail. Until it
  // succeeds, nothing about this attempt should stick: not a half-started
  // session sitting in the sidebar with no reply, and not the listen list
  // item it was filled in from, which the account would otherwise need to
  // notice missing and re-add by hand.
  try {
    if (ownBase?.session_id) {
      for (const message of listMessages(ownBase.session_id)) {
        addMessage(session.id, message.role, message.content);
      }
    }

    if (input.memo?.trim()) {
      addMessage(session.id, 'user', input.memo.trim());
    }

    const chatWork = { title: session.title, artist: session.artist };
    const history = listMessages(session.id);
    const opening =
      history.length > 0
        ? await continueSession(chatWork, history, true)
        : await openingMessage(chatWork, true);
    addMessage(session.id, 'assistant', opening);
  } catch (e) {
    db.transaction(() => deleteSessionData(session.id))();
    throw e;
  }

  if (listenItem) deleteListenItem(listenItem.id, userId);

  return {
    kind: 'started',
    session,
    messages: listMessages(session.id),
  };
}

// Prefer explicit title and artist values, then fill blanks from a URL lookup.
function resolveWork(
  title: string | undefined,
  artist: string | undefined,
  pastedLookup: PastedLookup | null
): { title: string; artist: string } | null {
  let workTitle = title?.trim() ?? '';
  let workArtist = artist?.trim() ?? '';
  if (pastedLookup) {
    workTitle = workTitle || pastedLookup.title;
    workArtist = workArtist || pastedLookup.artist;
  }
  return workTitle && workArtist
    ? { title: workTitle, artist: workArtist }
    : null;
}
