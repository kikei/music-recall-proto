import { useState } from 'react';
import { editCard, playerToUrl, type Card } from '../api/client.js';
import { AutoTextarea } from './AutoTextarea.js';

// Card edit form in the detail view. Edit hook, recall phrase, background, and
// player URL. Saving a field empty removes that item.
export function CardEditForm({
  card,
  onSaved,
  onCancel,
}: {
  card: Card;
  onSaved: (card: Card) => void;
  onCancel: () => void;
}) {
  const [hook, setHook] = useState(card.hook);
  const [recallPhrase, setRecallPhrase] = useState(card.recall_phrase);
  const [background, setBackground] = useState(card.background);
  const [playerUrl, setPlayerUrl] = useState(playerToUrl(card.player));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      const updated = await editCard(card.id, {
        hook,
        recall_phrase: recallPhrase,
        background,
        playerUrl,
      });
      onSaved(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-edit">
      <h3 className="card-target">
        {card.title} <span className="card-artist">/ {card.artist}</span>
      </h3>
      <label className="field">
        <span>引っかかり</span>
        <AutoTextarea value={hook} onChange={e => setHook(e.target.value)} />
      </label>
      <label className="field">
        <span>想起フレーズ</span>
        <AutoTextarea
          value={recallPhrase}
          onChange={e => setRecallPhrase(e.target.value)}
        />
      </label>
      <label className="field">
        <span>背景</span>
        <AutoTextarea
          value={background}
          onChange={e => setBackground(e.target.value)}
        />
      </label>
      <label className="field">
        <span>プレイヤー URL (Spotify / Apple Music / YouTube / Niconico)</span>
        <input
          value={playerUrl}
          onChange={e => setPlayerUrl(e.target.value)}
          placeholder="Spotify / Apple Music / YouTube / Niconico の URL を貼り付け (空にすると削除)"
        />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="edit-actions">
        <button disabled={busy} onClick={onCancel}>
          キャンセル
        </button>
        <button className="primary" disabled={busy} onClick={save}>
          {busy ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}
