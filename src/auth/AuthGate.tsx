import { useEffect, useState } from 'react';
import { useLogto, useHandleSignInCallback } from '@logto/react';
import { setAccessTokenGetter } from '../api/access-token.js';
import { onUnauthorized } from '../api/session-expiry.js';
import { apiResource, signInRedirectUri } from './logto-config.js';

// Nothing in the app renders until there is a signed-in account and the API
// client can obtain a token for it. Keeping the whole app behind this means no
// screen has to handle "not signed in" on its own.
export function AuthGate({ children }: { children: React.ReactNode }) {
  if (window.location.pathname === '/callback') {
    return <SignInCallback />;
  }
  return <RequireSignIn>{children}</RequireSignIn>;
}

function RequireSignIn({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, signIn, getAccessToken } = useLogto();
  // Children only mount once the token getter is registered, so their first
  // requests already carry an Authorization header.
  const [tokenReady, setTokenReady] = useState(false);
  // The server rejected the token, or none could be obtained. Whichever it was,
  // the way out is the same and no individual screen can offer it.
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setAccessTokenGetter(() => getAccessToken(apiResource));
    setTokenReady(true);
    return () => setAccessTokenGetter(null);
  }, [isAuthenticated, getAccessToken]);

  useEffect(() => {
    onUnauthorized(() => setExpired(true));
    return () => onUnauthorized(null);
  }, []);

  // Deliberately a screen with a button rather than an automatic redirect: if
  // the tenant is misconfigured every request answers 401, and redirecting on
  // each one would bounce between the app and the sign-in page forever.
  if (expired) {
    return (
      <div className="sign-in">
        <h1>音楽想起エンジン</h1>
        <p className="hint">
          サインインの有効期限が切れました。もう一度サインインしてください。
        </p>
        <button className="primary" onClick={() => signIn(signInRedirectUri)}>
          サインイン
        </button>
      </div>
    );
  }

  // Checked before isLoading on purpose. The SDK raises isLoading again for
  // every later token refresh, and unmounting the app for that would restart
  // it -- whose mount-time loads ask for a token, raising isLoading once more.
  // That cycle never ends and locks the tab up. Once the account is known and
  // the token getter is registered, the app stays mounted through refreshes.
  if (isAuthenticated && tokenReady) return <>{children}</>;

  if (isLoading) return <PageStatus>読み込んでいます…</PageStatus>;

  if (!isAuthenticated) {
    return (
      <div className="sign-in">
        <h1>音楽想起エンジン</h1>
        <p className="hint">
          聴いた記録はアカウントごとに保存されます。サインインして始めてください。
        </p>
        <button className="primary" onClick={() => signIn(signInRedirectUri)}>
          サインイン
        </button>
      </div>
    );
  }

  return <PageStatus>読み込んでいます…</PageStatus>;
}

// Lands here after the identity provider redirects back. Reload at the root so
// the app starts from a clean URL with the session already established.
function SignInCallback() {
  const { error } = useHandleSignInCallback(() => {
    window.location.replace('/');
  });

  if (error) {
    return (
      <div className="sign-in">
        <p className="error">サインインできませんでした: {error.message}</p>
        <button onClick={() => window.location.replace('/')}>やり直す</button>
      </div>
    );
  }
  return <PageStatus>サインインしています…</PageStatus>;
}

// A whole screen with nothing on it yet. Centred like the sign-in screen, so a
// wait looks like a considered state rather than a page that failed to draw.
function PageStatus({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-status">
      <p>{children}</p>
    </div>
  );
}
