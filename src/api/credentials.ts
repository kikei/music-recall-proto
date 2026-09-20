import { request } from './http.js';

// Third-party API keys an account supplies. The secret is only ever sent to the
// server; what comes back is whether it is set plus a few trailing characters.
export type CredentialKind =
  | 'openai'
  | 'spotify_client_id'
  | 'spotify_client_secret'
  | 'youtube';

export interface CredentialStatus {
  kind: CredentialKind;
  configured: boolean;
  hint: string;
}

export function listCredentials(): Promise<CredentialStatus[]> {
  return request('/api/credentials');
}

export function saveCredential(
  kind: CredentialKind,
  secret: string
): Promise<CredentialStatus[]> {
  return request(`/api/credentials/${kind}`, {
    method: 'PUT',
    body: JSON.stringify({ secret }),
  });
}

export function removeCredential(
  kind: CredentialKind
): Promise<CredentialStatus[]> {
  return request(`/api/credentials/${kind}`, { method: 'DELETE' });
}
