import { listenItemLabel } from '../lib/listen-item-label.js';
import type { ListenItem } from '../api/listen-list.js';

// The listen list itself: a box to add to it and the songs in order, oldest
// first. The whole row picks a song; only the small x beside it removes one.
// Purely presentational -- the box's text, error and notice are owned by the
// caller (see ListenListPanel), not this component, because this component
// unmounts when the panel closes. Owning that state here would lose it (and
// any error still waiting to be shown for a request that has not settled yet)
// the moment the account closes the panel while an add is in flight.
//
// `disabled` covers "the initial list has not loaded yet" and "an add or
// remove for this project is already in flight" -- add/remove are only ever
// done one at a time, reflected here rather than shown optimistically. It
// also gates picking: starting a session from an item that a same-moment
// removal is about to delete would otherwise fail once that DELETE lands.
// `busy` is the in-flight half of that alone, just to label the button while
// its own request is what the account is waiting on.
export function ListenList({
  items,
  autoFocus,
  text,
  error,
  notice,
  loaded,
  busy,
  disabled,
  onTextChange,
  onSubmit,
  onRemove,
  onPick,
  onRetryLoad,
}: {
  items: ListenItem[];
  autoFocus?: boolean;
  text: string;
  error: string;
  notice: string;
  loaded: boolean;
  busy: boolean;
  disabled: boolean;
  onTextChange: (value: string) => void;
  onSubmit: () => void;
  onRemove: (id: string) => void;
  onPick: (item: ListenItem) => void;
  onRetryLoad: () => void;
}) {
  return (
    <div className="listen-list">
      <div className="listen-add-row">
        <input
          className="listen-add"
          placeholder="曲名・アーティスト・URL"
          value={text}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          onChange={e => onTextChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSubmit();
            }
          }}
        />
        <button
          type="button"
          className="listen-add-submit primary"
          disabled={disabled || !text.trim()}
          onClick={onSubmit}
        >
          {busy ? '処理中…' : '追加'}
        </button>
      </div>
      {/* Shown for as long as the initial GET has not landed, which almost
          always means it is still in flight and this clears itself right
          away; the retry link only matters for the case where it failed and
          nothing else would ever move `loaded` forward. */}
      {!loaded && (
        <p className="notice listen-notice">
          読み込み中です。時間がかかる場合は
          <button type="button" className="listen-retry" onClick={onRetryLoad}>
            再読み込み
          </button>
        </p>
      )}
      {error && <p className="error listen-error">{error}</p>}
      {!error && notice && <p className="notice listen-notice">{notice}</p>}
      <ul className="listen-items">
        {items.map(item => {
          const { title, artist } = listenItemLabel(item);
          return (
            <li key={item.id} className="listen-item">
              <button
                type="button"
                className="listen-item-main"
                disabled={disabled}
                title={artist ? `${title} / ${artist}` : title}
                onClick={() => onPick(item)}
              >
                {title}
                {artist && <span className="side-artist"> / {artist}</span>}
              </button>
              <button
                type="button"
                className="listen-item-del"
                disabled={disabled}
                aria-label="聴きたいリストから削除"
                title="聴きたいリストから削除"
                onClick={() => onRemove(item.id)}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
