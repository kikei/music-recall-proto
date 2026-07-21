import { InlineEditText } from './InlineEditText.js';
import type { Card } from '../api/client.js';

// The work a card is about: title / artist (album). With `onEditField` the
// title and artist are click-to-edit in place; without it they are plain text.
// Shared by the card view and the edit form so the heading reads and behaves
// the same whether or not the form is open.
export function CardTitleText({
  card,
  onEditField,
}: {
  card: Card;
  onEditField?: (field: 'title' | 'artist', value: string) => Promise<void>;
}) {
  return (
    <span className="card-title-text">
      {onEditField ? (
        <InlineEditText
          value={card.title}
          ariaLabel="タイトル"
          onSave={v => onEditField('title', v)}
        />
      ) : (
        card.title
      )}{' '}
      <span className="card-artist">
        /{' '}
        {onEditField ? (
          <InlineEditText
            value={card.artist}
            ariaLabel="アーティスト"
            onSave={v => onEditField('artist', v)}
          />
        ) : (
          card.artist
        )}
      </span>
      {card.album ? <span className="card-album"> ({card.album})</span> : null}
    </span>
  );
}
