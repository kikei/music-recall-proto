import { Hono } from 'hono';
import {
  getSessionByPublicId,
  listActiveSessions,
  editSessionWork,
  deleteSession,
} from '../db/sessions.js';
import { addMessage, listMessages } from '../db/messages.js';
import { relatedToText } from '../cards/related.js';
import { continueSession, researchSession } from '../llm/chat.js';
import { createCardFromSession } from '../cards/from-session.js';
import { suggestFragment } from '../llm/suggest.js';
import { cardToClient } from '../cards/to-client.js';
import { sessionToClient } from '../sessions/to-client.js';
import type { PastedMetadataExtras } from '../cards/resolve-pasted-metadata.js';
import { startSession } from '../sessions/start.js';
import { INVALID_JSON_MESSAGE, readJsonObject } from './json-body.js';
import {
  requireProjectMember,
  type ProjectRouteEnv,
} from './project-context.js';

export const sessions = new Hono<ProjectRouteEnv>();

sessions.use('*', requireProjectMember);

// Open sessions for the workspace sidebar.
sessions.get('/', c => {
  const userId = c.get('userId');
  const project = c.get('project');
  return c.json(
    listActiveSessions(project.id, userId).map(session =>
      sessionToClient(session, project.slug)
    )
  );
});

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

function hasInvalidOptionalString(
  body: Record<string, unknown>,
  key: string
): boolean {
  return body[key] !== undefined && typeof body[key] !== 'string';
}

// Start a session: title, artist, memo (optional), continueFromCardId
// (optional). The opening message always involves a web search. With
// continueFromCardId, carry over that card's source session messages first
// (a continued session). A memo is recorded as the user's own words (the
// first user message) and answered.
sessions.post('/', async c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  const { title, artist, memo, continueFromCardId, playerUrl, metadataExtras } =
    body;

  if (
    ['title', 'artist', 'memo', 'continueFromCardId', 'playerUrl'].some(key =>
      hasInvalidOptionalString(body, key)
    ) ||
    (metadataExtras !== undefined &&
      (metadataExtras === null ||
        typeof metadataExtras !== 'object' ||
        Array.isArray(metadataExtras)))
  ) {
    return c.json({ error: 'セッションの入力形式が正しくありません。' }, 400);
  }
  if (
    metadataExtras &&
    ['album', 'released', 'label'].some(key =>
      hasInvalidOptionalString(metadataExtras as Record<string, unknown>, key)
    )
  ) {
    return c.json({ error: '参照情報の形式が正しくありません。' }, 400);
  }

  const result = await startSession(project.id, userId, {
    title: typeof title === 'string' ? title : undefined,
    artist: typeof artist === 'string' ? artist : undefined,
    memo: typeof memo === 'string' ? memo : undefined,
    continueFromCardId:
      typeof continueFromCardId === 'string' ? continueFromCardId : undefined,
    playerUrl: typeof playerUrl === 'string' ? playerUrl : undefined,
    metadataExtras: parseMetadataExtras(metadataExtras),
  });
  if (result.kind === 'unsupported-player-url') {
    return c.json({ error: '対応していない視聴 URL です。' }, 400);
  }
  if (result.kind === 'missing-work') {
    return c.json(
      { error: '対象とアーティストを入力するか、視聴 URL を貼ってください' },
      400
    );
  }
  if (result.kind === 'base-card-not-found') {
    return c.json({ error: '継続元のカードが見つかりません。' }, 404);
  }

  return c.json({
    session: sessionToClient(result.session, project.slug),
    messages: result.messages,
  });
});

sessions.get('/:id', c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const session = getSessionByPublicId(project.id, c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  return c.json({
    session: sessionToClient(session, project.slug),
    messages: listMessages(session.id),
  });
});

// Update an open session's title/artist (may have been filled from a pasted
// URL's metadata) and/or its freeform reference metadata. Title/artist are
// required, so reject an empty value; metadata is freeform.
sessions.patch('/:id', async c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const session = getSessionByPublicId(project.id, c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  if (
    ['title', 'artist', 'metadata'].some(key =>
      hasInvalidOptionalString(body, key)
    )
  ) {
    return c.json(
      { error: 'セッションの変更内容の形式が正しくありません。' },
      400
    );
  }
  const { title, artist, metadata } = body;
  const next = {
    title: typeof title === 'string' ? title.trim() : session.title,
    artist: typeof artist === 'string' ? artist.trim() : session.artist,
    metadata: typeof metadata === 'string' ? metadata : session.metadata,
  };
  if (!next.title || !next.artist) {
    return c.json({ error: '対象とアーティストは空にできません' }, 400);
  }
  const updated = editSessionWork(session.id, userId, next);
  if (!updated) throw new Error('更新対象のセッションが見つかりません。');
  return c.json(sessionToClient(updated, project.slug));
});

// Discard an open session (and its messages) from the workspace.
sessions.delete('/:id', c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const session = getSessionByPublicId(project.id, c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  deleteSession(session.id, userId);
  return c.json({ ok: true });
});

// Ambient recall: related past cards for the whole conversation so far.
// Embedding only (no LLM, no reason), meant to run after each Co-listener turn.
sessions.post('/:id/related', async c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const session = getSessionByPublicId(project.id, c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  const transcript = listMessages(session.id)
    .map(m => m.content)
    .join('\n');
  const related = await relatedToText(
    transcript,
    { projectId: project.id, userId },
    session.base_card_id ?? undefined
  );
  return c.json(related.map(card => cardToClient(card, project.slug, userId)));
});

// Ghost-text example for the fragment input, seeded from the most recent
// Co-listener message. Meant to be fetched once per turn (e.g. on focus), not
// on every keystroke. null when there is no assistant message yet.
sessions.get('/:id/suggest', async c => {
  const userId = c.get('userId');
  const project = c.get('project');
  const session = getSessionByPublicId(project.id, c.req.param('id'), userId);
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
  const userId = c.get('userId');
  const project = c.get('project');
  const session = getSessionByPublicId(project.id, c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  const { content, mode } = body;
  if (content !== undefined && typeof content !== 'string') {
    return c.json({ error: '入力の形式が正しくありません。' }, 400);
  }
  if (mode !== undefined && mode !== 'comment' && mode !== 'research') {
    return c.json({ error: 'モードが正しくありません。' }, 400);
  }
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
  const project = c.get('project');
  const session = getSessionByPublicId(project.id, c.req.param('id'), userId);
  if (!session) return c.json({ error: 'not found' }, 404);
  const body = await readJsonObject(c.req);
  if (!body) return c.json({ error: INVALID_JSON_MESSAGE }, 400);
  const { finalComment } = body;
  if (finalComment !== undefined && typeof finalComment !== 'string') {
    return c.json({ error: '最後のコメントの形式が正しくありません。' }, 400);
  }
  if (typeof finalComment === 'string' && finalComment.trim()) {
    addMessage(session.id, 'user', finalComment.trim());
  }
  const card = await createCardFromSession(session.id, userId);
  return c.json(cardToClient(card, project.slug, userId));
});
