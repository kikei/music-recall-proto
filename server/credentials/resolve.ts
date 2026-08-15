import { currentUserId } from '../auth/request-context.js';
import { readCredential } from '../db/credentials.js';

// Where each third-party key comes from. The two providers are treated
// differently on purpose:
//
// The LLM key is the account's own, with no fallback to an operator key. Every
// call costs real money, so it has to be billed to whoever made it; falling
// back would quietly charge the operator instead.
//
// Spotify and YouTube keys identify the application, not a person, and the app
// still works without them (paste a URL and it embeds). Registering a Spotify
// application is far more work than pasting an LLM key, so the operator's keys
// stay as the default and an account may override them -- useful mainly for
// someone hitting YouTube's daily quota.
function accountKey(kind: Parameters<typeof readCredential>[1]): string | null {
  const userId = currentUserId();
  return userId ? readCredential(userId, kind) : null;
}

export function openaiKey(): string {
  const key = accountKey('openai');
  if (!key) {
    throw new Error(
      'OpenAI の API キーが未設定です。設定画面から登録してください。'
    );
  }
  return key;
}

export function hasOpenaiKey(): boolean {
  return accountKey('openai') !== null;
}

export function spotifyCredentials(): { id: string; secret: string } | null {
  const id = accountKey('spotify_client_id') ?? process.env.SPOTIFY_CLIENT_ID;
  const secret =
    accountKey('spotify_client_secret') ?? process.env.SPOTIFY_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

export function youtubeKey(): string | null {
  return accountKey('youtube') ?? process.env.YOUTUBE_API_KEY ?? null;
}
