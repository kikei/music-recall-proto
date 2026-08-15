import { useEffect, useRef, useState } from 'react';
import {
  listCredentials,
  saveCredential,
  removeCredential,
  setDisplayName,
  type CredentialKind,
  type CredentialStatus,
} from '../api/client.js';

// Keys are grouped by the service they belong to rather than listed one per
// row: Spotify needs two values that are useless apart, so they are entered and
// cleared together.
interface KeyGroup {
  title: string;
  fields: { kind: CredentialKind; label: string; placeholder?: string }[];
}

const GROUPS: KeyGroup[] = [
  {
    title: 'OpenAI (必須)',
    fields: [
      {
        kind: 'openai',
        label: 'API キー',
        placeholder: 'sk-proj-A1b2C3d4E5f6…',
      },
    ],
  },
  {
    title: 'Spotify',
    fields: [
      {
        kind: 'spotify_client_id',
        label: 'Client ID',
        placeholder: '1a2b3c4d5e6f7a8b9c0d…',
      },
      {
        kind: 'spotify_client_secret',
        label: 'Client Secret',
        placeholder: '9f8e7d6c5b4a3f2e1d0c…',
      },
    ],
  },
  {
    title: 'YouTube',
    fields: [
      {
        kind: 'youtube',
        label: 'API キー',
        placeholder: 'AIzaSyA1b2C3d4E5f6…',
      },
    ],
  },
];

export function SettingsScreen({
  displayName,
  onDisplayNameChanged,
}: {
  displayName: string | null;
  onDisplayNameChanged: (next: string | null) => void;
}) {
  const [status, setStatus] = useState<CredentialStatus[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listCredentials()
      .then(setStatus)
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!status) return <p className="hint">読み込んでいます…</p>;

  return (
    <div className="settings">
      {error && <p className="error">{error}</p>}
      <h2>アカウント</h2>
      <DisplayNameField
        displayName={displayName}
        onChanged={onDisplayNameChanged}
        onError={setError}
      />
      <h2>API キー</h2>
      {GROUPS.map(group => (
        <KeyGroupFields
          key={group.title}
          group={group}
          status={status}
          onChanged={setStatus}
          onError={setError}
        />
      ))}
    </div>
  );
}

// The key fields are plain text rather than password inputs. An API key is not
// a login password, so the browser's password machinery has no business
// offering to save it -- and swapping a password input in and out of the DOM as
// the row changes between "set" and "entering" is what hung the tab.
//
// Saving usually changes little on screen, so success is easy to miss. This
// shows a short confirmation and clears itself, which is enough to tell the
// action apart from having done nothing.
function useDoneFlash(): [string, (message: string) => void] {
  const [done, setDone] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [
    done,
    (message: string) => {
      setDone(message);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(''), 2000);
    },
  ];
}

// The name shown in the sidebar. Generated when the account is created, so it
// is never blank, and free to be anything: it is a label, not an identifier, so
// there is no uniqueness to clash with and no character set to satisfy. It is
// deliberately not taken from the identity provider, which would mean holding a
// real name this app never needs.
function DisplayNameField({
  displayName,
  onChanged,
  onError,
}: {
  displayName: string | null;
  onChanged: (next: string | null) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, flashDone] = useDoneFlash();
  // Fills in once the account has loaded, without discarding an edit already
  // in progress.
  const [touched, setTouched] = useState(false);
  const value = touched ? draft : (displayName ?? '');
  const changed = value.trim() !== (displayName ?? '') && value.trim() !== '';

  async function save() {
    setBusy(true);
    onError('');
    try {
      onChanged((await setDisplayName(value.trim())).displayName);
      setTouched(false);
      flashDone('保存しました');
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="key-group first">
      <div className="key-body">
        <div className="key-fields">
          <div className="key-row">
            <span className="key-label">名前</span>
            <input
              className="key-input-short"
              value={value}
              maxLength={30}
              autoComplete="off"
              onChange={e => {
                setTouched(true);
                setDraft(e.target.value);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && changed) save();
              }}
            />
          </div>
        </div>
        <div className="key-actions">
          {done && <span className="key-saved">{done}</span>}
          {changed && (
            <button
              className="key-button primary"
              disabled={busy}
              onClick={save}
            >
              保存
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// A stored key sits where its input would be, with the action beside it: the
// state of a key and what you can do about it belong on the same line. There is
// no "change" action, because replacing a key is deleting it and entering the
// next one, and a separate edit mode only adds a state to get stuck in.
function KeyGroupFields({
  group,
  status,
  onChanged,
  onError,
}: {
  group: KeyGroup;
  status: CredentialStatus[];
  onChanged: (next: CredentialStatus[]) => void;
  onError: (message: string) => void;
}) {
  const [drafts, setDrafts] = useState<Partial<Record<CredentialKind, string>>>(
    {}
  );
  const [busy, setBusy] = useState(false);
  const [done, flashDone] = useDoneFlash();

  const of = (kind: CredentialKind) => status.find(s => s.kind === kind);
  // A group counts as set only when every value it needs is there: half of a
  // Spotify pair does nothing.
  const configured = group.fields.every(f => of(f.kind)?.configured);
  const filled = group.fields.filter(f => drafts[f.kind]?.trim());

  async function run(job: () => Promise<CredentialStatus[]>, message: string) {
    setBusy(true);
    onError('');
    try {
      onChanged(await job());
      setDrafts({});
      flashDone(message);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      let latest = status;
      for (const field of filled) {
        latest = await saveCredential(field.kind, drafts[field.kind]!.trim());
      }
      return latest;
    }, '保存しました');

  const clear = () =>
    run(async () => {
      let latest = status;
      for (const field of group.fields) {
        if (of(field.kind)?.configured) {
          latest = await removeCredential(field.kind);
        }
      }
      return latest;
    }, '削除しました');

  return (
    <section className="key-group">
      <div className="key-title">{group.title}</div>
      <div className="key-body">
        <div className="key-fields">
          {group.fields.map(field => (
            <div key={field.kind} className="key-row">
              <span className="key-label">{field.label}</span>
              {configured ? (
                <span className="key-value">
                  設定済み{' '}
                  <span className="key-hint">{of(field.kind)?.hint}</span>
                </span>
              ) : (
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={field.placeholder ?? ''}
                  value={drafts[field.kind] ?? ''}
                  onChange={e =>
                    setDrafts(d => ({ ...d, [field.kind]: e.target.value }))
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filled.length) save();
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="key-actions">
          {done && <span className="key-saved">{done}</span>}
          {configured ? (
            <button
              className="key-button danger"
              disabled={busy}
              onClick={clear}
            >
              削除
            </button>
          ) : (
            filled.length > 0 && (
              <button
                className="key-button primary"
                disabled={busy}
                onClick={save}
              >
                保存
              </button>
            )
          )}
        </div>
      </div>
    </section>
  );
}
