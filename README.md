# Music Recall Engine (prototype)

A personal tool that does not "store" music but creates the chance that it will
later be **recalled**. You put the impression of what you heard into words
through a dialogue with an LLM and leave it as a small "reunion card." Later, an
impression of another song or a vague phrase can make a past card surface again.

See [CONCEPT.md](./CONCEPT.md) for the details of the concept.

## What it does (scope of the prototype)

- **Listening session**: Start a session for a target (a song, album, live
  recording, etc.). You may paste a viewing URL (Spotify / YouTube / Niconico)
  to begin — in that case the target and artist are filled in automatically and
  do not need to be typed. Throw short words the moment something catches you,
  and an LLM playing a music sommelier helps put it into words, searching the
  web when useful. "Make a reunion card" compresses the session into one card.
- **Recall**: Enter the current trigger (an impression or a vague phrase) and
  hit "recall." Semantic search surfaces a few related cards and explains **why
  each is recalled now**. Results show a compact embedded player.
- **Cards list / appending**: Browse the cards you have accumulated. When a
  reunion deepens the impression, append to a card. A card embeds the player for
  its music.

A pasted player URL is embedded directly, so playback works even without any
external API keys.

## Setup

```sh
npm install
cp .env.example .env   # fill in OPENAI_API_KEY
npm run dev
```

`npm run dev` starts the backend (Hono, :8787) and the frontend (Vite, :5173)
at the same time. Open <http://localhost:5173> in a browser.

## Environment variables (.env)

| Variable | Default | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | (required) | OpenAI API key |
| `OPENAI_MODEL` | `gpt-5.5` | Dialogue, compression, recall reasons (web search) |
| `RANK_MODEL` | `gpt-4o-mini` | Reranking of recall candidates |
| `OPENAI_EMBED_MODEL` | `text-embedding-3-small` | Semantic search for recall |
| `SPOTIFY_CLIENT_ID` | (optional) | Resolve a Spotify player by search |
| `SPOTIFY_CLIENT_SECRET` | (optional) | Paired with `SPOTIFY_CLIENT_ID` |
| `YOUTUBE_API_KEY` | (optional) | Resolve a YouTube player by search |
| `DB_PATH` | `data/music-recall.sqlite` | SQLite file path |
| `PORT` | `8787` | Backend port |

The Spotify / YouTube keys are only used to auto-resolve a player when no URL is
pasted. Pasting a URL, and Niconico lookup, need no keys.

## Data

Stored locally in SQLite (`data/music-recall.sqlite`; override with `DB_PATH`).
The central unit of data is not the "song" but the "listening experience
(session)." No sample data is bundled; make a few cards yourself first, then try
recall.

## Structure

- `server/` — Hono API. `db/` data layer, `llm/` OpenAI integration, `cards/`
  recall and card generation, `player/` player resolution (Spotify / YouTube /
  Niconico), `routes/` endpoints.
- `src/` — React frontend. `screens/` holds the three screens, `api/` is the
  client.
