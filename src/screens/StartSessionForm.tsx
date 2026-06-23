import { useEffect, useMemo, useState } from 'react';
import { createSession, lookupPlayer, type Session } from '../api/client.js';
import { AutoTextarea } from '../components/AutoTextarea.js';
import { PlayerEmbed } from '../components/PlayerEmbed.js';
import { parsePlayerUrl } from '../player/parse-url.js';

// Start a new listening session. Pasting a viewing URL fills the target and
// artist from metadata, so they can be omitted.
export function StartSessionForm({
  onStarted,
}: {
  onStarted: (session: Session) => void;
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [memo, setMemo] = useState('');
  const [playerUrl, setPlayerUrl] = useState('');
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Each time a URL is pasted (or re-pasted), fetch the title/artist and
  // overwrite. Query after a short wait; drop in-flight results if the URL
  // changes.
  useEffect(() => {
    const url = playerUrl.trim();
    if (!url) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLooking(true);
      try {
        const meta = await lookupPlayer(url);
        if (cancelled) return;
        setTitle(meta.title);
        setArtist(meta.artist);
      } catch {
        // If lookup fails, leave it to manual input
      } finally {
        if (!cancelled) setLooking(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playerUrl]);

  async function start() {
    setBusy(true);
    setError('');
    try {
      const res = await createSession(title, artist, memo.trim(), {
        playerUrl: playerUrl.trim() || undefined,
      });
      onStarted(res.session);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Pasting a URL lets you omit title/artist (filled from metadata).
  const ready = !!playerUrl.trim() || (!!title && !!artist);

  // Preview the embed as soon as the URL is a recognizable player link.
  const player = useMemo(() => parsePlayerUrl(playerUrl), [playerUrl]);

  return (
    <section className="start-form">
      <p className="lead">今から聴く対象を教えてください。</p>
      <div className={player ? 'start-grid has-preview' : 'start-grid'}>
        <div className="start-fields">
          <label className="field">
            <span className="field-label">視聴 URL (任意)</span>
            <input
              placeholder="Spotify / Apple Music / YouTube / Niconico を貼ると検索せず使います"
              value={playerUrl}
              onChange={e => setPlayerUrl(e.target.value)}
            />
          </label>
          {looking && <p className="hint">URL から対象を取得しています…</p>}
          <label className="field">
            <span className="field-label">対象</span>
            <input
              placeholder="例: Kid A / Idioteque / ○○のライブ盤"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">アーティスト</span>
            <input
              placeholder="例: Radiohead"
              value={artist}
              onChange={e => setArtist(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">メモ (任意)</span>
            <AutoTextarea
              placeholder="まず自分の言葉で第一印象を書いてみる"
              value={memo}
              onChange={e => setMemo(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={busy || !ready} onClick={start}>
            {busy ? '作品を調べています…' : 'セッションを始める'}
          </button>
        </div>
        {player && (
          <div className="start-preview">
            <PlayerEmbed player={player} compact />
          </div>
        )}
      </div>
    </section>
  );
}
