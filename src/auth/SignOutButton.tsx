import { useLogto } from '@logto/react';
import { signOutRedirectUri } from './logto-config.js';

// Kept in this directory so the identity provider's SDK stays contained here
// rather than spreading into the app's own screens.
export function SignOutButton() {
  const { signOut } = useLogto();
  return (
    <button
      className="side-signout"
      onClick={() => signOut(signOutRedirectUri)}
    >
      サインアウト
    </button>
  );
}
