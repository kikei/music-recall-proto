import { Hono } from 'hono';
import {
  createSession,
  getSession,
  listActiveSessions,
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
import { cardToClient } from '../cards/to-client.js';
import { parsePlayerUrl } from '../player/parse-url.js';
import { describePlayer } from '../player/describe-player.js';
import type { Player } from '../player/provider.js';

export const sessions = new Hono();

// Open sessions for the workspace sidebar.
sessions.get('/', c => c.json(listActiveSessions()));

// Decide the title and artist from the input and the pasted URL. If either is
// empty but a URL is present, fill it from the dedicated API metadata. Returns
// null unless both are present.
async function resolveWork(
  title: unknown,
  artist: unknown,
  pasted: Player | null
): Promise<{ title: string; artist: string } | null> {
  let workTitle = typeof title === 'string' ? title.trim() : '';
  let workArtist = typeof artist === 'string' ? artist.trim() : '';
  if (pasted && (!workTitle || !workArtist)) {
    const meta = await describePlayer(pasted);
    if (meta) {
      workTitle = workTitle || meta.title;
      workArtist = workArtist || meta.artist;
    }
  }
  return workTitle && workArtist
    ? { title: workTitle, artist: workArtist }
    : null;
}

// Start a session: title, artist, memo (optional), continueFromCardId
// (optional). The opening message always involves a web search. With
// continueFromCardId, carry over that card's source session messages first
// (a continued session). A memo is recorded as the user's own words (the
// first user message) and answered.
sessions.post('/', async c => {
  const { title, artist, memo, continueFromCardId, playerUrl } =
    await c.req.json();

  // If a URL was pasted at start, parse it syntactically and attach it to the
  // session. Invalid URLs are ignored and left to search at card creation.
  const pasted = parsePlayerUrl(
    typeof playerUrl === 'string' ? playerUrl : null
  );

  const work = await resolveWork(title, artist, pasted);
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
  const session = createSession(
    work.title,
    work.artist,
    null,
    baseId,
    pasted ? JSON.stringify(pasted) : null
  );

  if (baseId) {
    const base = getCard(baseId);
    if (base?.session_id) {
      for (const m of listMessages(base.session_id)) {
        addMessage(session.id, m.role, m.content);
      }
    }
  }

  if (typeof memo === 'string' && memo.trim()) {
    addMessage(session.id, 'user', memo.trim());
  }

  const chatWork = {
    title: session.title,
    artist: session.artist,
    album: session.album,
  };
  const history = listMessages(session.id);
  const opening =
    history.length > 0
      ? await continueSession(chatWork, history, true)
      : await openingMessage(chatWork, true);
  addMessage(session.id, 'assistant', opening);

  return c.json({ session, messages: listMessages(session.id) });
});

sessions.get('/:id', c => {
  const session = getSession(c.req.param('id'));
  if (!session) return c.json({ error: 'not found' }, 404);
  return c.json({ session, messages: listMessages(session.id) });
});

// Ambient recall: related past cards for the whole conversation so far.
// Embedding only (no LLM, no reason), meant to run after each Co-listener turn.
sessions.post('/:id/related', async c => {
  const session = getSession(c.req.param('id'));
  if (!session) return c.json({ error: 'not found' }, 404);
  const transcript = listMessages(session.id)
    .map(m => m.content)
    .join('\n');
  const related = await relatedToText(
    transcript,
    session.base_card_id ?? undefined
  );
  return c.json(related);
});

// Posting a fragment makes the sommelier help articulate it, consulting the
// web as needed. mode: 'comment' (default) responds to an impression/fragment;
// 'research' always runs a web search and returns the findings. In 'research'
// the body is optional (empty means investigate the recent context).
sessions.post('/:id/messages', async c => {
  const session = getSession(c.req.param('id'));
  if (!session) return c.json({ error: 'not found' }, 404);
  const { content, mode } = await c.req.json();
  const research = mode === 'research';
  if (!research && !content) {
    return c.json({ error: '入力が空です' }, 400);
  }

  const work = {
    title: session.title,
    artist: session.artist,
    album: session.album,
  };
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
  const session = getSession(c.req.param('id'));
  if (!session) return c.json({ error: 'not found' }, 404);
  const { finalComment } = await c.req.json().catch(() => ({}));
  if (typeof finalComment === 'string' && finalComment.trim()) {
    addMessage(session.id, 'user', finalComment.trim());
  }
  const card = await createCardFromSession(session.id);
  return c.json(cardToClient(card));
});
