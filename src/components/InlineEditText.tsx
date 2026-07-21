import { useLayoutEffect, useRef, useState } from 'react';

// Understated in-place text editor. Renders plain text until clicked, then an
// input that saves on blur/Enter and reverts on Escape. An empty or unchanged
// value is treated as no edit. On a save failure the input stays open so the
// edit can be retried; the caller surfaces the error.
//
// The input hugs its content: a hidden mirror span measures the actual rendered
// width of the draft, which works for proportional and full-width (Japanese)
// text alike -- a `ch`-based guess would clip either.
export function InlineEditText({
  value,
  onSave,
  className,
  ariaLabel,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  className?: string;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);
  const cancelled = useRef(false);
  const sizerRef = useRef<HTMLSpanElement>(null);

  // Match the mirror's measured width; +8px covers the input's padding, border,
  // and room for the caret so the last glyph is never clipped.
  useLayoutEffect(() => {
    if (editing && sizerRef.current) {
      setWidth(sizerRef.current.offsetWidth + 8);
    }
  }, [editing, draft]);

  function begin() {
    setDraft(value);
    cancelled.current = false;
    setEditing(true);
  }

  async function commit() {
    const next = draft.trim();
    if (cancelled.current || !next || next === value) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      // Keep the input open for a retry; the caller shows the error.
    } finally {
      setBusy(false);
    }
  }

  const cls = className ? ` ${className}` : '';

  if (!editing) {
    return (
      <span
        className={`inline-edit${cls}`}
        role="button"
        tabIndex={0}
        title="クリックで編集"
        onClick={begin}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            begin();
          }
        }}
      >
        {value}
      </span>
    );
  }

  return (
    <>
      <span ref={sizerRef} className={`inline-edit-sizer${cls}`} aria-hidden>
        {draft || ' '}
      </span>
      <input
        className={`inline-edit-input${cls}`}
        aria-label={ariaLabel}
        autoFocus
        disabled={busy}
        value={draft}
        style={{ width }}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelled.current = true;
            e.currentTarget.blur();
          }
        }}
      />
    </>
  );
}
