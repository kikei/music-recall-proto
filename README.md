# Music Recall Engine (prototype)

A personal tool that does not "store" music but creates the chance that it will
later be **recalled**. You put the impression of what you heard into words
through a dialogue with an LLM and leave it as a small "reunion card." Later, an
impression of another song or a vague phrase can make a past card surface again.

See [CONCEPT.md](./CONCEPT.md) for the details of the concept.

## What it does (scope of the prototype)

- **Listening session**: Start a session for a target (a song, album, live
  recording, etc.). You may paste a viewing URL (Spotify / Apple Music /
  YouTube / Niconico) to begin — in that case the target and artist are filled
  in automatically and do not need to be typed. Throw short words the moment
  something catches you,
  and an LLM acting as a Co-listener helps put it into words, searching the
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
cp .env.example .env   # fill in CREDENTIAL_SECRET and the Logto/OIDC values
npm run dev
```

Sign-in goes through Logto (any standard OIDC provider works; a development
tenant is fine locally). Every `/api/*` route requires a signed-in user, so the
app will not come up until `OIDC_ISSUER`, `OIDC_AUDIENCE`,
`VITE_LOGTO_ENDPOINT`, `VITE_LOGTO_APP_ID`, and `VITE_LOGTO_RESOURCE` point at a
working tenant. LLM features additionally need each account to enter its own
OpenAI API key from the Settings screen after signing in — there is
deliberately no operator fallback, since usage is billed to whoever makes the
call.

`npm run dev` starts the backend (Hono, :8787) and the frontend (Vite, :5173)
at the same time. Open <http://localhost:5173> in a browser.

## Environment variables (.env)

| Variable                | Default                    | Description                                                                   |
| ----------------------- | -------------------------- | ----------------------------------------------------------------------------- |
| `CREDENTIAL_SECRET`     | (required)                 | Encrypts the API keys accounts enter; generate with `openssl rand -base64 32` |
| `OIDC_ISSUER`           | (required)                 | Token issuer for sign-in (a Logto tenant's `/oidc` endpoint)                  |
| `OIDC_AUDIENCE`         | (required)                 | The API resource indicator registered with the OIDC provider                  |
| `VITE_LOGTO_ENDPOINT`   | (required)                 | The same tenant, as seen by the browser                                       |
| `VITE_LOGTO_APP_ID`     | (required)                 | Logto application id, exposed to the client                                   |
| `VITE_LOGTO_RESOURCE`   | (required)                 | Same as `OIDC_AUDIENCE`, exposed to the client                                |
| `SPOTIFY_CLIENT_ID`     | (optional)                 | Resolve a Spotify player by search                                            |
| `SPOTIFY_CLIENT_SECRET` | (optional)                 | Paired with `SPOTIFY_CLIENT_ID`                                               |
| `YOUTUBE_API_KEY`       | (optional)                 | Resolve a YouTube player by search                                            |
| `DB_PATH`               | `data/music-recall.sqlite` | SQLite file path                                                              |
| `PORT`                  | `8787`                     | Backend port                                                                  |
| `WEB_ROOT`              | `dist`                     | Built frontend directory the backend serves in production                     |

There is no `OPENAI_API_KEY` here: each account enters its own from the
Settings screen, encrypted at rest with `CREDENTIAL_SECRET`. Model choice
(provider, per-use models, web search context) lives in
`server/llm/model-config.ts`, not in `.env`.

The Spotify / YouTube keys are only used to auto-resolve a player when no URL
is pasted; pasting a URL needs no keys for any provider, and Apple Music /
Niconico lookups are keyless APIs regardless. See
[docs/player-api-keys.txt](./docs/player-api-keys.txt) for step-by-step setup of
the Spotify and YouTube keys.

## Data

Stored locally in SQLite (`data/music-recall.sqlite`; override with `DB_PATH`).
The central unit of data is not the "song" but the "listening experience
(session)." No sample data is bundled; make a few cards yourself first, then try
recall.

## Structure

- `server/` — Hono API. `auth/` verifies the Logto-issued token (JWKS via
  `jose`) and gates every `/api/*` route, `db/` data layer, `llm/` LLM
  integration behind a provider seam (`provider.ts` + per-vendor adapters;
  every call goes through `run.ts`, which records one row per call into the
  `llm_usage` table), `cards/` recall and card generation, `player/` player
  resolution (Spotify / Apple Music / YouTube / Niconico), `routes/`
  endpoints.
- `src/` — React frontend. `screens/` holds five screens (`CardsScreen`,
  `RecallScreen`, `SessionScreen`, `SettingsScreen`, `StartSessionForm`),
  `api/` is the client.

LLM usage and derived cost are logged per call; `GET /api/usage` returns an
aggregated summary (totals, by use, by model). Cost is derived from a rate table
in `server/llm/pricing.ts` since vendors do not return dollar cost.

## Development

Run `npm test` (Vitest) for the unit tests. Coverage is intentionally partial
so far — pure functions with real failure modes (metadata template filling,
player URL parsing and resolution, recall similarity, prompt citation
cleanup), not the whole codebase. After changes, also verify with
`npx tsc --noEmit` (types) and `npx vite build` (production build); format
with `npm run format` (Prettier). `better-sqlite3` builds a native module, so
`npm install` needs a working build toolchain.
