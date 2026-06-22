# Listening sessions workspace + ambient recall (design)

Status: agreed. Implementation on branch `feature/sessions-workspace`.

## Motivation

A real listening workflow (from the author): a work is listened to about twice
while writing impressions, and the resolution of the wording rises as the
session goes on. Mid-session, another work comes to mind; listening to it raises
its resolution too, and you want to write about it. A second session is born
naturally, linked to the first by that act of remembering.

The current UI binds the session screen to a single in-progress session, so this
parallel, cross-pollinating way of working is not supported.

## Model: a workspace of open sessions

Like the conversation list in a ChatGPT / Claude UI.

- The session area holds a set of open sessions in a sidebar (each labeled by
  its target work). One session is foregrounded for conversation; clicking
  another switches the foreground. "+ New" adds another open session; it does
  not replace the current one. There is no cap on concurrent sessions.
- Sessions are durable. Messages are already persisted server-side, so a session
  is reconstructable from the server and survives reloads and switching.
- Completing a session (make card) removes it from the workspace and opens the
  new card as a standalone page (see Navigation).

Spawning a new parallel session is done from the sidebar ("+ New"), not from the
recall rail. The recall rail only opens cards (see below).

## Ambient recall (in-session, no AI commentary)

While you write, the engine quietly surfaces related works.

- Trigger: after each Co-listener (assistant) turn.
- Query: the whole conversation transcript so far.
- Pool: past cards only (not other open draft sessions).
- Method: embedding similarity only. No LLM rerank, no generated reason text.
  This keeps it fast, cheap, and non-intrusive — consistent with the project
  rule of not putting an LLM on the always-on path. Show a few bare cards
  (title / artist, optionally a compact player).
- Click: open the card as a standalone page. It does not spawn a session.

This contrasts with completion-time recall (`finish` -> recall), which keeps the
LLM-written reason text for a slower, considered read.

## Naming

The AI role is the **Co-listener**. Rename the current "music sommelier
(音楽ソムリエ)" across prompts, UI strings, and CONCEPT to Co-listener.

## Navigation & layout

A single-screen, left-sidebar layout (chat-UI style). Card detail and the manual
recall become standalone pages in the main area, not modal overlays.

```
+-----------+------------------+---------+
| Sessions  | conversation     | related |
|  A(active)| > ...            | card X  |
|  B        | Co-listener: ... | card Y  |
|  + New    |                  |         |
|-----------|                  |         |
| Cards     |                  |         |
| Recall    |                  |         |
+-----------+------------------+---------+
```

- Left rail: open sessions (with active highlight) + "+ New", plus entries for
  Cards and Recall.
- Main area: the foreground session's conversation, or a standalone view (a
  card page, the cards list, or the manual recall view).
- Right rail: ambient related works for the current session (reason-less; click
  opens the card page).

Cards and Recall are still needed as functions; in this layout they are left-rail
entries that open in the main area, replacing the modal overlays used today.

## Implementation notes

- New endpoints to make sessions durable and switchable:
  - list active sessions (e.g. `GET /api/sessions?status=active`),
  - get a session with its messages (e.g. `GET /api/sessions/:id`).
- New lightweight ambient-recall path: embed the transcript, cosine against card
  embeddings, return the top N bare cards. Reuses `embed` + `cosineSimilarity` +
  `listCards`; skips `rankRecall`, produces no reason.
- A compact, reason-less list component for the rail (the current
  `RecallResultList` includes a reason).
- Opening a card from the rail counts as a recall hit (bumps `recall_count`).
- Self / same-work cards may surface (the work being listened to may already
  have past cards). This is acceptable and arguably desirable.
- Card detail and recall move from modal components to standalone main-area
  views (a small view-state/router in `App`).

## Locked decisions

1. Ambient recall fires on each Co-listener turn, querying the whole
   conversation.
2. Recall pool is past cards only.
3. The recall rail click opens the card only; new sessions come from the
   sidebar.
4. The manual recall function stays (as a main-area view).
5. AI role is named Co-listener.
6. No cap on concurrent open sessions.
7. On completion, open the new card as a standalone page (not a modal).
8. Left-sidebar (chat-UI) layout; card and recall are main-area views.

## Out of scope (for now)

- Recording the A -> B "spawned from" link between sessions.
- Spawning a session from the recall rail.
- Including other open draft sessions in the ambient recall pool.
- Reason text in ambient recall.
