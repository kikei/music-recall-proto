import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { TokenVerifier, VerifiedIdentity } from './identity.js';

// Standard OIDC implementation of the seam: fetch the issuer's discovery
// document, then verify access tokens against its published JWKS. Nothing here
// is vendor-specific, so any OIDC provider works by changing the two env vars.
// OIDC_AUDIENCE must match the API resource the frontend requests a token for;
// without it the provider issues an opaque token that cannot be verified.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} が未設定です。.env に設定してください。`);
  }
  return value;
}

let cachedKeys: ReturnType<typeof createRemoteJWKSet> | null = null;
// The in-flight discovery fetch, if any. Concurrent requests arriving before
// cachedKeys is set must share this rather than each starting their own
// discovery + JWKS round trip to the provider.
let keysPromise: Promise<ReturnType<typeof createRemoteJWKSet>> | null = null;

// Resolve the JWKS endpoint through discovery once; jose then caches and
// rotates the signing keys itself.
async function signingKeys(): Promise<ReturnType<typeof createRemoteJWKSet>> {
  if (cachedKeys) return cachedKeys;
  if (!keysPromise) {
    keysPromise = (async () => {
      const issuer = required('OIDC_ISSUER').replace(/\/$/, '');
      const res = await fetch(`${issuer}/.well-known/openid-configuration`);
      if (!res.ok) {
        throw new Error(`OIDC の設定を取得できません (${res.status})`);
      }
      const config = (await res.json()) as { jwks_uri?: string };
      if (!config.jwks_uri) {
        throw new Error('OIDC の設定に jwks_uri がありません');
      }
      cachedKeys = createRemoteJWKSet(new URL(config.jwks_uri));
      return cachedKeys;
    })();
    // A failed discovery must not stick: let the next call try again.
    keysPromise.catch(() => {
      keysPromise = null;
    });
  }
  return keysPromise;
}

export const oidcVerifier: TokenVerifier = {
  name: 'oidc',

  async verify(token: string): Promise<VerifiedIdentity> {
    const { payload } = await jwtVerify(token, await signingKeys(), {
      issuer: required('OIDC_ISSUER').replace(/\/$/, ''),
      audience: required('OIDC_AUDIENCE'),
    });
    if (!payload.sub) throw new Error('トークンに sub がありません');
    return { subject: payload.sub };
  },
};
