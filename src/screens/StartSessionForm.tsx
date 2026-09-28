import { useEffect, useMemo, useRef, useState } from 'react';
import type { ListenItem } from '../api/listen-list.js';
import { lookupPlayer, playerToUrl } from '../api/players.js';
import { createSession, type Session } from '../api/sessions.js';
import { AutoTextarea } from '../components/AutoTextarea.js';
import { PlayerEmbed } from '../components/PlayerEmbed.js';
import { parsePlayerUrl } from '../player/parse-url.js';

// Start a new listening session. Pasting a viewing URL fills the target and
// artist from metadata, so they can be omitted. A song picked from the listen
// list fills the same fields and moves the cursor to where the impression is
// written; the item leaves the list once the session starts.
export function StartSessionForm({
  projectSlug,
  fill,
  onFillApplied,
  onStarted,
}: {
  projectSlug: string;
  fill: ListenItem | null;
  onFillApplied: () => void;
  onStarted: (session: Session, listenItemId?: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [memo, setMemo] = useState('');
  const [playerUrl, setPlayerUrl] = useState('');
  // The listen list item this form was last filled in from, if any: starting
  // the session removes it from the list. Only picking a different item (fill
  // below) changes it -- editing the fields does not, since title/artist text
  // cannot safely tell "still the same song, metadata corrected" apart from
  // "a different song, same artist".
  const [listenItemId, setListenItemId] = useState<string | null>(null);
  const [focusNext, setFocusNext] = useState<'memo' | 'title' | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const memoRef = useRef<HTMLTextAreaElement>(null);
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lookupError, setLookupError] = useState('');
  const [showServices, setShowServices] = useState(false);
  const servicesRef = useRef<HTMLSpanElement>(null);

  // Reference metadata picked up from a pasted URL's lookup, shown and
  // editable right alongside title/artist so a correction happens in one
  // pass instead of a separate visit to the metadata editor later.
  const [trackLevel, setTrackLevel] = useState<boolean | null>(null);
  const [album, setAlbum] = useState('');
  const [released, setReleased] = useState('');
  const [label, setLabel] = useState('');
  const [lookedUp, setLookedUp] = useState(false);

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

  // Each time a URL is pasted (or re-pasted), fetch the title/artist and any
  // extra reference metadata, and overwrite. Query after a short wait; drop
  // in-flight results if the URL changes.
  useEffect(() => {
    const url = playerUrl.trim();
    if (!url) {
      setLookupError('');
      setLookedUp(false);
      setTrackLevel(null);
      setAlbum('');
      setReleased('');
      setLabel('');
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLooking(true);
      try {
        const meta = await lookupPlayer(url);
        if (cancelled) return;
        setTitle(meta.title);
        setArtist(meta.artist);
        setTrackLevel(meta.trackLevel);
        setAlbum(meta.album ?? '');
        setReleased(meta.released ?? '');
        setLabel(meta.label ?? '');
        setLookedUp(true);
        setLookupError('');
      } catch (e) {
        // Manual input remains available, but surface why auto-fill did not
        // happen instead of silently treating the lookup as empty.
        if (cancelled) return;
        setLookupError(e instanceof Error ? e.message : String(e));
        setLookedUp(false);
        setTrackLevel(null);
        setAlbum('');
        setReleased('');
        setLabel('');
      } finally {
        if (!cancelled) setLooking(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [playerUrl]);

  // Fill the fields from a listen list item. What was written for another song
  // is not carried over.
  useEffect(() => {
    if (!fill) return;
    onFillApplied();
    setPlayerUrl(playerToUrl(fill.player));
    // A plain-text entry (no link, no artist already resolved) is usually a
    // quickly jotted artist name ("amazarashi") rather than a specific song or
    // album title, so it goes into the artist field: a guess that is right
    // more often than assuming it names the work itself.
    const plainText = !fill.player && !fill.artist;
    setTitle(plainText ? '' : fill.title);
    setArtist(plainText ? fill.title : fill.artist);
    setMemo('');
    setListenItemId(fill.id);
    setFocusNext(plainText ? 'title' : 'memo');
    // Runs once per picked item.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fill]);

  // The impression box only appears once the work is known, which for a link
  // that is still being looked up is a moment after the fill.
  const showMemo = !!title.trim() && !!artist.trim();
  useEffect(() => {
    if (focusNext === 'title') {
      titleRef.current?.focus();
      setFocusNext(null);
    } else if (focusNext === 'memo' && showMemo) {
      memoRef.current?.focus();
      setFocusNext(null);
    }
  }, [focusNext, showMemo]);
  // A link that cannot be resolved never shows the box; do not leave the
  // focus request waiting to jump in later.
  useEffect(() => {
    if (lookupError) setFocusNext(null);
  }, [lookupError]);

  async function start() {
    setBusy(true);
    setError('');
    try {
      const res = await createSession(projectSlug, title, artist, memo.trim(), {
        playerUrl: playerUrl.trim() || undefined,
        metadataExtras: lookedUp ? { album, released, label } : undefined,
        listenItemId: listenItemId ?? undefined,
      });
      onStarted(res.session, listenItemId ?? undefined);
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
      <div className="start-grid">
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
                  対応サービス: Spotify / Apple Music / YouTube / ニコニコ動画
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
          {lookupError && <p className="error">{lookupError}</p>}
          <label className="field">
            <span className="field-label">
              {trackLevel === true
                ? '楽曲'
                : trackLevel === false
                  ? 'アルバム'
                  : '楽曲・アルバム'}
            </span>
            <input
              ref={titleRef}
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
          {lookedUp && (
            <div className="start-metadata-preview">
              {trackLevel === true && (
                <label className="field">
                  <span className="field-label">アルバム (任意)</span>
                  <input
                    value={album}
                    onChange={e => setAlbum(e.target.value)}
                  />
                </label>
              )}
              <label className="field field-released">
                <span className="field-label">発売日 (任意)</span>
                <input
                  value={released}
                  onChange={e => setReleased(e.target.value)}
                />
              </label>
              <label className="field field-record-label">
                <span className="field-label">レーベル (任意)</span>
                <input value={label} onChange={e => setLabel(e.target.value)} />
              </label>
            </div>
          )}
          {showMemo && (
            <label className="field field-memo">
              <span className="field-label">感じたこと・気づいたこと</span>
              <AutoTextarea
                ref={memoRef}
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
          <div className="start-side">
            <div className="start-preview">
              <PlayerEmbed player={player} compact />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
