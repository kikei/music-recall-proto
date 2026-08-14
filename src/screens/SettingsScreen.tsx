import { useEffect, useState } from 'react';
import {
  listCredentials,
  saveCredential,
  removeCredential,
  type CredentialKind,
  type CredentialStatus,
} from '../api/client.js';

// What each key is for, in the order it matters to the listener. The LLM key is
// the one the app cannot work without; the player keys only improve automatic
// resolution, which is why they are described as optional.
const FIELDS: {
  kind: CredentialKind;
  label: string;
  note: string;
  placeholder: string;
}[] = [
  {
    kind: 'openai',
    label: 'OpenAI API キー (必須)',
    note: '対話・カード生成・想起はこのキーで動きます。設定しないと使えません。',
    placeholder: 'sk-...',
  },
  {
    kind: 'spotify_client_id',
    label: 'Spotify Client ID (任意)',
    note: '未設定なら共通のキーを使います。',
    placeholder: '',
  },
  {
    kind: 'spotify_client_secret',
    label: 'Spotify Client Secret (任意)',
    note: '',
    placeholder: '',
  },
  {
    kind: 'youtube',
    label: 'YouTube API キー (任意)',
    note: '未設定なら共通のキーを使います。',
    placeholder: '',
  },
];

export function SettingsScreen() {
  const [status, setStatus] = useState<CredentialStatus[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listCredentials()
      .then(setStatus)
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function run(job: Promise<CredentialStatus[]>) {
    setError('');
    try {
      setStatus(await job);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (!status) {
    return <p className="hint">読み込んでいます…</p>;
  }

  return (
    <div className="settings">
      <h2>API キー</h2>
      <p className="hint">
        キーはこのサーバで暗号化して保存され、画面には戻しません。利用料は
        キーの持ち主に請求されます。
      </p>
      {error && <p className="error">{error}</p>}
      {FIELDS.map(field => (
        <CredentialField
          key={field.kind}
          field={field}
          status={status.find(s => s.kind === field.kind)}
          onSave={secret => run(saveCredential(field.kind, secret))}
          onClear={() => run(removeCredential(field.kind))}
        />
      ))}
    </div>
  );
}

function CredentialField({
  field,
  status,
  onSave,
  onClear,
}: {
  field: (typeof FIELDS)[number];
  status?: CredentialStatus;
  onSave: (secret: string) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft.trim()) return;
    setBusy(true);
    await onSave(draft.trim());
    setDraft('');
    setBusy(false);
  }

  async function clear() {
    setBusy(true);
    await onClear();
    setBusy(false);
  }

  return (
    <div className="credential-field">
      <div className="credential-head">
        <span className="credential-label">{field.label}</span>
        <span className="credential-state">
          {status?.configured ? `設定済み ${status.hint}` : '未設定'}
        </span>
      </div>
      {field.note && <p className="hint">{field.note}</p>}
      <div className="credential-entry">
        <input
          type="password"
          autoComplete="off"
          placeholder={
            status?.configured ? '変更する場合のみ入力' : field.placeholder
          }
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') save();
          }}
        />
        <button
          className="primary"
          disabled={busy || !draft.trim()}
          onClick={save}
        >
          保存
        </button>
        {status?.configured && (
          <button className="danger" disabled={busy} onClick={clear}>
            削除
          </button>
        )}
      </div>
    </div>
  );
}
