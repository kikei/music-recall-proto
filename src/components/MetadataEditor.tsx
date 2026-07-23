import { useState } from 'react';
import { AutoTextarea } from './AutoTextarea.js';

// Reference metadata (album, label, personnel, release, ...) under a toggle so
// it stays out of the impression-led flow. Freeform text: not parsed, not
// embedded, no effect on recall. Collapsed by default (secondary to the note);
// shared by the card detail and the session view.
export function MetadataEditor({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (next: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const saved = value ?? '';

  function toggle() {
    setDraft(saved);
    setOpen(o => !o);
  }

  // Auto-save when focus leaves the field, only when it actually changed.
  async function commit() {
    if (draft === saved) return;
    try {
      await onSave(draft);
    } catch {
      // The parent surfaces the error; the draft stays for a retry.
    }
  }

  return (
    <div className="card-metadata">
      <button className="metadata-toggle" onClick={toggle}>
        {open ? '▾ メタデータ (自由記述)' : '▸ メタデータ (自由記述)'}
      </button>
      {open && (
        <div className="metadata-edit">
          <AutoTextarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
          />
        </div>
      )}
    </div>
  );
}
