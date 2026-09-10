import { Hono } from 'hono';
import {
  createSession,
  getSession,
  listActiveSessions,
  editSessionWork,
  deleteSession,
} from '../db/sessions.js';
import { getCard } from '../db/cards.js';
import { addMessage, listMessages } from '../db/messages.js';
import { relatedToText } from '../cards/related.js';
import {
  continueSession,
  openingMessage,
  researchSession,
} from '../llm/chat.js';
import { createCardFromSession } from '../cards/from-session.js';
import { suggestFragment } from '../llm/suggest.js';
import { cardToClient } from '../cards/to-client.js';
import { sessionToClient } from '../sessions/to-client.js';
import { parsePlayerUrl } from '../player/parse-url.js';
import {
  resolvePastedMetadata,
  composePastedMetadata,
  type PastedLookup,
  type PastedMetadataExtras,
} from '../cards/resolve-pasted-metadata.js';
import { BLANK_METADATA_TEMPLATE } from '../cards/metadata-template.js';
import type { AppEnv } from '../auth/require-user.js';

export const sessions = new Hono<AppEnv>();

// Open sessions for the workspace sidebar.
sessions.get('/', c =>
  c.json(listActiveSessions(c.get('userId')).map(sessionToClient))
);

// Decide the title and artist from the input and a pasted URL's lookup. If
// either is empty, fill it from the lookup. Returns null unless both end up
// present.
function resolveWork(
  title: unknown,
  artist: unknown,
  pastedLookup: PastedLookup | null
): { title: string; artist: string } | null {
  let workTitle = typeof title === 'string' ? title.trim() : '';
  let workArtist = typeof artist === 'string' ? artist.trim() : '';
  if (pastedLookup) {
    workTitle = workTitle || pastedLookup.title;
    workArtist = workArtist || pastedLookup.artist;
  }
  return workTitle && workArtist
    ? { title: workTitle, artist: workArtist }
    : null;
}

// Read the account's own edits to the start form's album/released/label
// preview. Undefined (not an object at all) means no lookup ever succeeded
// client-side, as opposed to an empty string, which means the account
// reviewed the field and left/made it blank.
function parseMetadataExtras(input: unknown): PastedMetadataExtras | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const obj = input as Record<string, unknown>;
  const pick = (key: string): string | undefined => {
    const value = obj[key];
    if (typeof value !== 'string') return undefined;
    return value.trim() || undefined;
  };
  return {
    album: pick('album'),
    released: pick('released'),
    label: pick('label'),
  };
}

// Start a session: title, artist, memo (optional), continueFromCardId
// (optional). The opening message always involves a web search. With
// continueFromCardId, carry over that card's source session messages first
// (a continued session). A memo is recorded as the user's own words (the
// first user message) and answered.
sessions.post('/', async c => {
  const userId = c.get('userId');
  const { title, artist, memo, continueFromCardId, playerUrl, metadataExtras } =
    await c.req.json();

  // If a URL was pasted at start, parse it syntactically and attach it to the
  // session. Invalid URLs are ignored and left to search at card creation.
  const pasted = parsePlayerUrl(
    typeof playerUrl === 'string' ? playerUrl : null
  );

  // A pasted link is looked up once here (regardless of whether title/artist
  // are already filled in), since its response is also the fallback source
  // for metadataExtras below if the account submits before the start form's
  // own lookup resolves.
  const pastedLookup = pasted ? await resolvePastedMetadata(pasted) : null;

  const work = resolveWork(title, artist, pastedLookup);
  if (!work) {
    return c.json(
      { error: '対象とアーティストを入力するか、視聴 URL を貼ってください' },
      400
    );
  }

  // Continued session: record the original card as base and carry over the
  // past conversation.
  const baseId =
    typeof continueFromCardId === 'string' && continueFromCardId
      ? continueFromCardId
      : null;
  const base = baseId ? getCard(baseId, userId) : null;
  // Seed the reference metadata: on a continued session from the base card so
  // its notes carry over, otherwise the blank template. Track/Album and
  // Artist(s) are always derived from the work decided above (not copied
  // from the lookup), so they can never go stale relative to an edited
  // title/artist; album/released/label come from the account's own review
  // in the start form (or, failing that, straight from the lookup).
  const seedMetadata = base?.metadata ?? BLANK_METADATA_TEMPLATE;
  const extras = parseMetadataExtras(metadataExtras) ?? pastedLookup?.extras;
  const metadata = composePastedMetadata(seedMetadata, pasted, work, extras);
  const session = createSession(
    userId,
    work.title,
    work.artist,
    metadata,
    baseId,
    pasted ? JSON.stringify(pasted) : null
  );

  if (base?.session_id) {
    for (const m of listMessages(base.session_id)) {
      addMessage(session.id, m.role, m.content);
    }
  }

  if (typeof memo === 'string' && memo.trim()) {
    addMessage(session.id, 'user', memo.trim());
  }

  const chatWork = { title: session.title, artist: session.artist };
  const history = listMessages(session.id);
  const opening =
    history.length > 0
      ? await continueSession(chatWork, history, true)
      : await openingMessage(chatWork, true);
  addMessage(session.id, 'assistant', opening);

  return c.json({
    session: sessionToClient(session),
    messages: listMessages(session.id),
  });
});

sessions.get('/:id', c => {
  const session = getSession(c.req.param('id'), c.get('userId'));
  if (!session) return c.json({ error: 'not found' }, 404);
  return c.json({
    session: sessionToClient(session),
    messages: listMessages(session.id),
  });
});

// Update an open session's title/artist (may have been filled from a pasted
// URL's metadata) and/or its freeform reference metadata. Title/artist are
// required, so reject an empty value; metadata is freeform.
sessions.patch('/:id', async c => {
  const userId = c.get('userId');
  const session = getSession(c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  const { title, artist, metadata } = await c.req.json().catch(() => ({}));
  const next = {
    title: typeof title === 'string' ? title.trim() : session.title,
    artist: typeof artist === 'string' ? artist.trim() : session.artist,
    metadata: typeof metadata === 'string' ? metadata : session.metadata,
  };
  if (!next.title || !next.artist) {
    return c.json({ error: '対象とアーティストは空にできません' }, 400);
  }
  const updated = editSessionWork(session.id, userId, next);
  return c.json(sessionToClient(updated!));
});

// Discard an open session (and its messages) from the workspace.
sessions.delete('/:id', c => {
  const userId = c.get('userId');
  const session = getSession(c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  deleteSession(session.id, userId);
  return c.json({ ok: true });
});

// Ambient recall: related past cards for the whole conversation so far.
// Embedding only (no LLM, no reason), meant to run after each Co-listener turn.
sessions.post('/:id/related', async c => {
  const userId = c.get('userId');
  const session = getSession(c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  const transcript = listMessages(session.id)
    .map(m => m.content)
    .join('\n');
  const related = await relatedToText(
    transcript,
    userId,
    session.base_card_id ?? undefined
  );
  return c.json(related);
});

// Ghost-text example for the fragment input, seeded from the most recent
// Co-listener message. Meant to be fetched once per turn (e.g. on focus), not
// on every keystroke. null when there is no assistant message yet.
sessions.get('/:id/suggest', async c => {
  const userId = c.get('userId');
  const session = getSession(c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  const last = [...listMessages(session.id)]
    .reverse()
    .find(m => m.role === 'assistant');
  if (!last) return c.json({ suggestion: null });
  const suggestion = await suggestFragment(last.content);
  return c.json({ suggestion });
});

// Posting a fragment makes the Co-listener help articulate it. mode: 'comment'
// (default) responds to an impression/fragment without a web search (to keep
// per-turn cost down; press "research" to consult the web); 'research' always
// runs a web search and returns the findings. In 'research' the body is
// optional (empty means investigate the recent context).
sessions.post('/:id/messages', async c => {
  const session = getSession(c.req.param('id'), c.get('userId'));
  if (!session) return c.json({ error: 'not found' }, 404);
  const { content, mode } = await c.req.json();
  const research = mode === 'research';
  if (!research && !content) {
    return c.json({ error: '入力が空です' }, 400);
  }

  const work = { title: session.title, artist: session.artist };
  const text = typeof content === 'string' ? content.trim() : '';
  const user = text ? addMessage(session.id, 'user', text) : null;
  const reply = research
    ? await researchSession(work, listMessages(session.id))
    : await continueSession(work, listMessages(session.id));
  const assistant = addMessage(session.id, 'assistant', reply);
  return c.json({ user, assistant });
});

// End the session -> compress into a reunion card. finalComment is the "last
// comment before recording"; if present, it is taken in as part of the session
// (a user message) before compressing (no reply is generated).
sessions.post('/:id/card', async c => {
  const userId = c.get('userId');
  const session = getSession(c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  const { finalComment } = await c.req.json().catch(() => ({}));
  if (typeof finalComment === 'string' && finalComment.trim()) {
    addMessage(session.id, 'user', finalComment.trim());
  }
  const card = await createCardFromSession(session.id, userId);
  return c.json(cardToClient(card));
});
