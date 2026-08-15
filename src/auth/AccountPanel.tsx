import { useLogto } from '@logto/react';
import { signOutRedirectUri } from './logto-config.js';

// The foot of the sidebar: who is signed in on the left, the two things you can
// do about it on the right. Icons rather than words for the actions, since they
// are reached rarely and should not compete with the cards above. The name
// opens settings as well, since that is where anything about the account is
// changed and it gives the gear a much larger target beside it.
//
// The name is the one chosen in settings, never the identity provider's: this
// is a listening tool and has no reason to hold, or show, who someone actually
// is. For the same reason there is no avatar.
export function AccountPanel({
  displayName,
  active,
  onSettings,
}: {
  displayName: string | null;
  active: boolean;
  onSettings: () => void;
}) {
  const { signOut } = useLogto();
  return (
    <div className="side-account">
      <button
        className="side-account-name"
        title={displayName ?? ''}
        onClick={onSettings}
      >
        {displayName ?? ''}
      </button>
      <div className="side-account-actions">
        <button
          className={active ? 'side-account-icon active' : 'side-account-icon'}
          onClick={onSettings}
          title="設定"
          aria-label="設定"
        >
          <GearIcon />
        </button>
        <button
          className="side-account-icon"
          onClick={() => signOut(signOutRedirectUri)}
          title="サインアウト"
          aria-label="サインアウト"
        >
          <SignOutIcon />
        </button>
      </div>
    </div>
  );
}

// Drawn as strokes in currentColor so both icons inherit the hover and active
// colours without a second set of rules.
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65
           1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0
           0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65
           1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0
           4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0
           0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1
           1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0
           0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0
           0-1.51 1z"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
