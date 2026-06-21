import { useEffect, useState } from 'react';
import {
  createSession,
  sendFragment,
  research,
  makeCard,
  recallFromCard,
  lookupPlayer,
  type Session,
  type ChatMessage,
  type Card,
  type RecallResult,
} from '../api/client.js';
import { CardView } from '../components/CardView.js';
import { PlayerEmbed } from '../components/PlayerEmbed.js';
import { RichText } from '../components/RichText.js';
import { AutoTextarea } from '../components/AutoTextarea.js';
import { RecallResultList } from '../components/RecallResultList.js';

export function SessionScreen({
  started,
  onStartedConsumed,
  onOpenCard,
}: {
  started: { session: Session; messages: ChatMessage[] } | null;
  onStartedConsumed: () => void;
  onOpenCard: (cardId: string, fromRecall: boolean) => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [card, setCard] = useState<Card | null>(null);
  const [related, setRelated] = useState<RecallResult[] | null>(null);
  const [relating, setRelating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Take over a session that was started from the detail view.
  useEffect(() => {
    if (!started) return;
    setSession(started.session);
    setMessages(started.messages);
    setDraft('');
    setCard(null);
    setRelated(null);
    setError('');
    onStartedConsumed();
  }, [started, onStartedConsumed]);

  function reset() {
    setSession(null);
    setMessages([]);
    setDraft('');
    setCard(null);
    setRelated(null);
    setError('');
  }

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (card) {
    return (
      <section>
        <p className="notice">再会カードを作りました。</p>
        <CardView card={card} />
        {card.player && <PlayerEmbed player={card.player} />}
        <div className="session-related">
          {relating && <p className="hint">関連するカードを想起中…</p>}
          {related && related.length > 0 && (
            <>
              <p className="lead">このカードから想起されたもの</p>
              <RecallResultList
                results={related}
                onOpen={id => onOpenCard(id, true)}
              />
            </>
          )}
        </div>
        <button className="primary" onClick={reset}>
          新しいセッションを始める
        </button>
      </section>
    );
  }

  function begin(started: Session, opening: ChatMessage[]) {
    setSession(started);
    setMessages(opening);
  }

  if (!session) {
    return <StartForm busy={busy} error={error} onStart={begin} run={run} />;
  }

  async function send() {
    const content = draft.trim();
    if (!content) return;
    const res = await run(() => sendFragment(session!.id, content));
    if (res) {
      setMessages(prev => [...prev, res.user, res.assistant]);
      setDraft('');
    }
  }

  // "research": have the AI run a web search again. Any input is passed as the
  // point to investigate.
  async function investigate() {
    const res = await run(() => research(session!.id, draft.trim()));
    if (res) {
      setMessages(prev =>
        res.user ? [...prev, res.user, res.assistant] : [...prev, res.assistant]
      );
      setDraft('');
    }
  }

  // Text left in the input is taken into the session as the "last comment
  // before recording" before compressing.
  async function finish() {
    const made = await run(() => makeCard(session!.id, draft.trim()));
    if (!made) return;
    setCard(made);
    // Recall related cards from the new card and show them alongside it.
    setRelating(true);
    try {
      setRelated(await recallFromCard(made.id));
    } catch {
      // A recall failure must not block showing the card
    } finally {
      setRelating(false);
    }
  }

  return (
    <section>
      <div className="track-header">
        <strong>{session.title}</strong> / {session.artist}
        {session.album ? ` (${session.album})` : ''}
      </div>
      <ChatLog messages={messages} />
      {error && <p className="error">{error}</p>}
      <FragmentInput
        busy={busy}
        value={draft}
        onChange={setDraft}
        onSend={send}
        onResearch={investigate}
      />
      <button
        className="primary session-finish"
        disabled={busy}
        onClick={finish}
      >
        聴き終えた → 再会カードにする
      </button>
    </section>
  );
}

function StartForm({
  busy,
  error,
  onStart,
  run,
}: {
  busy: boolean;
  error: string;
  onStart: (session: Session, messages: ChatMessage[]) => void;
  run: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [memo, setMemo] = useState('');
  const [playerUrl, setPlayerUrl] = useState('');
  const [looking, setLooking] = useState(false);

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
    const res = await run(() =>
      createSession(title, artist, memo.trim(), {
        playerUrl: playerUrl.trim() || undefined,
      })
    );
    if (res) onStart(res.session, res.messages);
  }

  // Pasting a URL lets you omit title/artist (filled from metadata).
  const ready = !!playerUrl.trim() || (!!title && !!artist);

  return (
    <section className="start-form">
      <p className="lead">
        今から聴く対象を教えてください。Spotify / YouTube / ニコニコ動画の URL
        を貼れば、対象とアーティストは省略できます。
      </p>
      <input
        placeholder="視聴 URL (任意): Spotify / YouTube / ニコニコ動画 を貼ると検索せず使います"
        value={playerUrl}
        onChange={e => setPlayerUrl(e.target.value)}
      />
      {looking && <p className="hint">URL から対象を取得しています…</p>}
      <input
        placeholder="対象 (例: Kid A / Idioteque / ○○のライブ盤)"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <input
        placeholder="アーティスト"
        value={artist}
        onChange={e => setArtist(e.target.value)}
      />
      <AutoTextarea
        placeholder="メモ (任意): まず自分の言葉で第一印象を書いてみる"
        value={memo}
        onChange={e => setMemo(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy || !ready} onClick={start}>
        {busy ? '作品を調べています…' : 'セッションを始める'}
      </button>
    </section>
  );
}

function ChatLog({ messages }: { messages: ChatMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="hint">
        聴きながら気になった瞬間を、短い言葉で投げてください。
      </p>
    );
  }
  return (
    <div className="chat-log">
      {messages.map(m => (
        <div key={m.id} className={`bubble ${m.role}`}>
          {m.role === 'assistant' ? <RichText text={m.content} /> : m.content}
        </div>
      ))}
    </div>
  );
}

function FragmentInput({
  busy,
  value,
  onChange,
  onSend,
  onResearch,
}: {
  busy: boolean;
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
  onResearch: () => void;
}) {
  return (
    <div className="fragment-input">
      <AutoTextarea
        placeholder="例: 金属音が反復していて、だんだん行進みたいに聞こえる"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSend();
        }}
      />
      <div className="fragment-actions">
        <button disabled={busy} onClick={onResearch}>
          {busy ? '…' : '調べる'}
        </button>
        <button
          className="primary"
          disabled={busy || !value.trim()}
          onClick={onSend}
        >
          {busy ? '…' : '送る'}
        </button>
      </div>
    </div>
  );
}
