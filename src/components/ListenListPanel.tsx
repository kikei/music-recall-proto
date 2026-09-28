import { useRef, useState } from 'react';
import type { ListenItem } from '../api/listen-list.js';
import { ListenList } from './ListenList.js';
import { usePopoverMenu } from './usePopoverMenu.js';

// The listen list, opened from the top right over whatever screen is showing,
// so it can be read and added to without leaving the page. Picking a song
// closes it. The trigger shows no count: a number that only grows would read
// as a backlog to clear.
export function ListenListPanel({
  items,
  loaded,
  onAdd,
  onRemove,
  onPick,
  onRetryLoad,
}: {
  items: ListenItem[];
  loaded: boolean;
  onAdd: (text: string) => Promise<ListenItem | null>;
  onRemove: (id: string) => Promise<void>;
  onPick: (item: ListenItem) => void;
  onRetryLoad: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { closeOnEscape } = usePopoverMenu({
    open,
    setOpen,
    containerRef: panelRef,
    triggerRef,
  });

  // The add box's own state lives here, in this always-mounted component,
  // rather than in ListenList itself: ListenList is only rendered while
  // `open` is true, so it unmounts (discarding whatever state it held) the
  // moment the panel closes. Closing the panel while an add is still waiting
  // on the server is entirely possible -- there is nothing that keeps it open
  // for that -- so a failure or a duplicate notice arriving after the panel
  // has closed still needs somewhere durable to land, with the typed text
  // still there for the account to see and retry once they reopen it.
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // True from the moment a submit or a removal starts until its server
  // response is in: add and remove are only ever done one at a time, so there
  // is nothing to reconcile between a local guess and what the server says --
  // `items` only ever changes once the server has actually agreed to it.
  const [busy, setBusy] = useState(false);

  function changeText(value: string) {
    setText(value);
    setError('');
    setNotice('');
  }

  // The box keeps its text until the add actually succeeds, so a slow or
  // failed submit never loses what was typed; a duplicate is not an error --
  // the entry is already in the list below -- but staying silent when nothing
  // visibly changes reads as the add having failed, so it says so too, and
  // also keeps the text (the account may want to edit and resubmit it).
  async function submit() {
    const entry = text.trim();
    if (!entry || busy || !loaded) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const duplicate = await onAdd(entry);
      if (duplicate) {
        // created_at is an ISO timestamp; its own first 10 characters are the
        // date, without converting to local time the way formatDate would.
        setNotice(
          `すでにリストにあります (登録日: ${duplicate.created_at.slice(0, 10)})`
        );
      } else {
        setText('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy || !loaded) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await onRemove(id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="listen-menu" ref={panelRef} onKeyDown={closeOnEscape}>
      <button
        type="button"
        className="listen-trigger"
        ref={triggerRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span>聴きたいリスト</span>
        <svg viewBox="0 0 12 8" aria-hidden focusable="false" className="chev">
          <path d="m1 1 5 5 5-5" />
        </svg>
      </button>
      {/* The trigger's own border draws only the straight sides and bottom
          (see .listen-trigger); this traces the open top -- each corner
          flares outward into the reserved top gap instead of closing off,
          since a plain border-radius corner can only curve inward. Sized to
          the button's own box (viewBox matches its typical rendered size) and
          stretched to fill it exactly, so a slightly different width from
          in-page font rendering does not misalign it. */}
      <svg
        className="listen-trigger-outline"
        viewBox="0 0 142 40"
        preserveAspectRatio="none"
        aria-hidden
        focusable="false"
      >
        <path d="M0,0 A10,10 0 0,1 10,10 L10,30 A10,10 0 0,0 20,40 L122,40 A10,10 0 0,0 132,30 L132,10 A10,10 0 0,1 142,0" />
      </svg>
      {open && (
        <div className="listen-panel" role="dialog" aria-label="聴きたいリスト">
          <ListenList
            items={items}
            autoFocus
            text={text}
            error={error}
            notice={notice}
            loaded={loaded}
            busy={busy}
            disabled={busy || !loaded}
            onTextChange={changeText}
            onSubmit={() => void submit()}
            onRemove={id => void remove(id)}
            onPick={item => {
              setOpen(false);
              onPick(item);
            }}
            onRetryLoad={onRetryLoad}
          />
        </div>
      )}
    </div>
  );
}
