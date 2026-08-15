// Bridges the auth SDK (React context) to the API client (a plain module).
// The gate registers a getter once the person is signed in, and every request
// attaches whatever it returns. Keeping it here means the API client has no
// dependency on the identity provider.
type TokenGetter = () => Promise<string | undefined>;

let getToken: TokenGetter | null = null;

export function setAccessTokenGetter(getter: TokenGetter | null): void {
  getToken = getter;
}

export async function accessToken(): Promise<string | undefined> {
  return getToken ? getToken() : undefined;
}
