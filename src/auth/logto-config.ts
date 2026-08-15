import type { LogtoConfig } from '@logto/react';

// Which tenant and application to sign in against. These differ between the
// development tenant and the production one, so they come from the environment
// rather than being baked in. They are public identifiers, not secrets.
const ENDPOINT = 'VITE_LOGTO_ENDPOINT';
const APP_ID = 'VITE_LOGTO_APP_ID';
// The API resource the access token is issued for. The server verifies this as
// the audience, so both sides must name the same resource.
const RESOURCE = 'VITE_LOGTO_RESOURCE';

function read(name: string): string {
  return import.meta.env[name] ?? '';
}

// Reported to the setup notice so a half-finished .env says what is missing,
// instead of the app failing to load with a blank page.
export const missingAuthEnv = [ENDPOINT, APP_ID, RESOURCE].filter(
  name => !read(name)
);

export const isAuthConfigured = missingAuthEnv.length === 0;

export const apiResource = read(RESOURCE);

export const logtoConfig: LogtoConfig = {
  endpoint: read(ENDPOINT),
  appId: read(APP_ID),
  resources: [apiResource],
};

// Where the provider sends the browser back after sign-in.
export const signInRedirectUri = `${window.location.origin}/callback`;
export const signOutRedirectUri = window.location.origin;
