import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [showServices, setShowServices] = useState(false);
  const servicesRef = useRef<HTMLSpanElement>(null);

  // Close the supported-services popover on an outside click.
  useEffect(() => {
    if (!showServices) return;
    function onClickOutside(e: MouseEvent) {
      if (
        servicesRef.current &&
        !servicesRef.current.contains(e.target as Node)
      ) {
        setShowServices(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showServices]);

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
      <div className={player ? 'start-grid has-preview' : 'start-grid'}>
        <div className="start-fields">
          <p className="lead">いま、なにを聴いていますか?</p>
          <label className="field">
            <span className="field-label">
              視聴 URL (任意)
              <span className="field-hint" ref={servicesRef}>
                <button
                  type="button"
                  className="field-hint-icon"
                  onClick={() => setShowServices(v => !v)}
                  aria-label="対応サービスを表示"
                >
                  ?
                </button>
                <span
                  className={
                    showServices
                      ? 'field-hint-popover visible'
                      : 'field-hint-popover'
                  }
                >
                  対応サービス: Spotify / Apple Music / YouTube /
                  ニコニコ動画
                </span>
              </span>
            </span>
            <input
              placeholder="例: https://www.youtube.com/watch?v=..."
              value={playerUrl}
              onChange={e => setPlayerUrl(e.target.value)}
            />
          </label>
          {looking && <p className="hint">URL からデータを取得しています…</p>}
          <label className="field">
            <span className="field-label">楽曲・アルバム</span>
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
          {title.trim() && artist.trim() && (
            <label className="field field-memo">
              <span className="field-label">感じたこと・気づいたこと</span>
              <AutoTextarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
              />
            </label>
          )}
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
