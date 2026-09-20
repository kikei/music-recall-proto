import { useRef, useState } from 'react';
import type { Card } from '../api/cards.js';
import { usePopoverMenu } from './usePopoverMenu.js';

export function VisibilityControl({
  value,
  disabled,
  onChange,
}: {
  value: Card['visibility'];
  disabled: boolean;
  onChange: (visibility: Card['visibility']) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const controlRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label =
    value === 'private'
      ? '自分のみ'
      : value === 'members'
        ? 'プロジェクト内'
        : '公開する';
  const { closeAndFocusTrigger, closeOnEscape } = usePopoverMenu({
    open,
    setOpen,
    containerRef: controlRef,
    triggerRef,
  });

  function choose(next: Card['visibility']) {
    closeAndFocusTrigger(() => {
      if (next !== value) void onChange(next);
    });
  }

  return (
    <div
      className={
        value === 'private'
          ? 'visibility-control private'
          : 'visibility-control'
      }
      ref={controlRef}
      onKeyDown={closeOnEscape}
    >
      <button
        type="button"
        className="visibility-trigger"
        ref={triggerRef}
        disabled={disabled}
        aria-label={`公開範囲: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <span className="visibility-icon-slot" aria-hidden>
          {value === 'private' ? (
            <PrivateLock />
          ) : value === 'public' ? (
            <PublicGlobe />
          ) : null}
        </span>
        <span className="visibility-trigger-label">{label}</span>
        <svg
          className="visibility-chevron"
          viewBox="0 0 12 8"
          aria-hidden
          focusable="false"
        >
          <path d="m1 1 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div className="visibility-menu" role="menu" aria-label="公開範囲">
          <VisibilityOption
            label="公開する"
            selected={value === 'public'}
            onSelect={() => choose('public')}
          />
          <VisibilityOption
            label="自分のみ"
            selected={value === 'private'}
            onSelect={() => choose('private')}
          />
        </div>
      )}
    </div>
  );
}

function VisibilityOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={selected ? 'visibility-option selected' : 'visibility-option'}
      role="menuitemradio"
      aria-checked={selected}
      onClick={onSelect}
    >
      <span className="visibility-check" aria-hidden>
        {selected ? '✓' : ''}
      </span>
      {label}
    </button>
  );
}

function PrivateLock() {
  return (
    <svg
      className="private-lock"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <path d="M7 11V7.5a5 5 0 0 1 10 0V11" />
      <rect x="4" y="10" width="16" height="12" rx="2.5" />
      <circle cx="12" cy="15.5" r="1.35" />
      <path className="private-lock-keyway" d="M12 16.5V19" />
    </svg>
  );
}

function PublicGlobe() {
  return (
    <svg
      className="public-globe"
      viewBox="0 0 24 24"
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.7 2.5 4.1 5.5 4.1 9S14.7 18.5 12 21M12 3C9.3 5.5 7.9 8.5 7.9 12s1.4 6.5 4.1 9" />
    </svg>
  );
}
