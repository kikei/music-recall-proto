import { useEffect, useState } from 'react';
import {
  getSession,
  sendFragment,
  research,
  makeCard,
  relatedToSession,
  recallHit,
  type Session,
  type ChatMessage,
  type Card,
} from '../api/client.js';
import { RichText } from '../components/RichText.js';
import { AutoTextarea } from '../components/AutoTextarea.js';
import { RelatedRail } from '../components/RelatedRail.js';
import { CardView } from '../components/CardView.js';
import { PlayerEmbed } from '../components/PlayerEmbed.js';

// The foreground session: the conversation with the Co-listener plus an ambient
// recall rail that updates after each Co-listener turn.
export function SessionView({
  sessionId,
  onCardCreated,
  onOpenCard,
}: {
  sessionId: string;
  onCardCreated: (card: Card) => void;
  onOpenCard: (cardId: string, fromRecall: boolean) => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [related, setRelated] = useState<Card[] | null>(null);
  const [selected, setSelected] = useState<Card | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Open a recalled card inline (keeping the session), bumping its reference
  // count like any recall hit.
  function openRelated(card: Card) {
    recallHit(card.id).catch(() => {});
    setSelected(card);
  }

  // Load the session and its conversation, then fetch ambient related cards.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getSession(sessionId);
        if (cancelled) return;
        setSession(res.session);
        setMessages(res.messages);
        refreshRelated();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function refreshRelated() {
    try {
      setRelated(await relatedToSession(sessionId));
    } catch {
      // Ambient recall is best-effort; ignore failures
    }
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

  async function send() {
    const content = draft.trim();
    if (!content) return;
    const res = await run(() => sendFragment(sessionId, content));
    if (res) {
      setMessages(prev => [...prev, res.user, res.assistant]);
      setDraft('');
      refreshRelated();
    }
  }

  // "research": have the Co-listener run a web search again. Any input is passed
  // as the point to investigate.
  async function investigate() {
    const res = await run(() => research(sessionId, draft.trim()));
    if (res) {
      setMessages(prev =>
        res.user ? [...prev, res.user, res.assistant] : [...prev, res.assistant]
      );
      setDraft('');
      refreshRelated();
    }
  }

  // Text left in the input is taken in as the "last comment before recording"
  // before compressing into a card.
  async function finish() {
    const made = await run(() => makeCard(sessionId, draft.trim()));
    if (made) onCardCreated(made);
  }

  if (!session) {
    return <p className="hint">読み込んでいます…</p>;
  }

  return (
    <div className="session-view">
      <section className="conversation">
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
      {selected ? (
        <aside className="related-rail">
          <div className="rail-head">
            <button className="rail-back" onClick={() => setSelected(null)}>
              ← 想起へ戻る
            </button>
          </div>
          <CardView card={selected} />
          {selected.player && <PlayerEmbed player={selected.player} compact />}
          <button
            className="rail-detail-link"
            onClick={() => onOpenCard(selected.id, true)}
          >
            詳細ページを開く
          </button>
        </aside>
      ) : (
        <RelatedRail related={related} onOpen={openRelated} />
      )}
    </div>
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
