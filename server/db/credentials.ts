import { db } from './open.js';
import { encryptSecret, decryptSecret } from '../credentials/cipher.js';

// The third-party keys an account can supply. Kept as rows keyed by kind rather
// than columns on users, so adding a provider (an Anthropic key, say) needs no
// schema change. Spotify needs two values, hence the split kinds.
export const CREDENTIAL_KINDS = [
  'openai',
  'spotify_client_id',
  'spotify_client_secret',
  'youtube',
] as const;

export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export function isCredentialKind(value: string): value is CredentialKind {
  return (CREDENTIAL_KINDS as readonly string[]).includes(value);
}

// What the settings screen may know: whether a key is set and just enough of it
// to recognise which one it is. The secret itself never leaves the server.
export interface CredentialStatus {
  kind: CredentialKind;
  configured: boolean;
  hint: string;
}

// Enough to tell two keys apart without being useful on its own.
function hintOf(secret: string): string {
  return secret.length <= 4 ? '****' : `…${secret.slice(-4)}`;
}

export function setCredential(
  userId: string,
  kind: CredentialKind,
  secret: string
): void {
  db.prepare(
    `INSERT INTO user_credentials (user_id, kind, secret, hint, updated_at)
     VALUES (@user_id, @kind, @secret, @hint, @updated_at)
     ON CONFLICT (user_id, kind) DO UPDATE SET
       secret = @secret, hint = @hint, updated_at = @updated_at`
  ).run({
    user_id: userId,
    kind,
    secret: encryptSecret(secret),
    hint: hintOf(secret),
    updated_at: new Date().toISOString(),
  });
}

export function clearCredential(userId: string, kind: CredentialKind): void {
  db.prepare('DELETE FROM user_credentials WHERE user_id = ? AND kind = ?').run(
    userId,
    kind
  );
}

export function readCredential(
  userId: string,
  kind: CredentialKind
): string | null {
  const row = db
    .prepare(
      'SELECT secret FROM user_credentials WHERE user_id = ? AND kind = ?'
    )
    .get(userId, kind) as { secret: string } | undefined;
  return row ? decryptSecret(row.secret) : null;
}

export function listCredentialStatus(userId: string): CredentialStatus[] {
  const rows = db
    .prepare('SELECT kind, hint FROM user_credentials WHERE user_id = ?')
    .all(userId) as { kind: CredentialKind; hint: string }[];
  const byKind = new Map(rows.map(r => [r.kind, r.hint]));
  return CREDENTIAL_KINDS.map(kind => ({
    kind,
    configured: byKind.has(kind),
    hint: byKind.get(kind) ?? '',
  }));
}
