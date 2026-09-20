import { useEffect, useRef, useState } from 'react';
import { createProject, type Project } from '../api/projects.js';

export function ProjectCreateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [busy, onClose]);

  async function submit() {
    if (!name.trim() || !slug.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      onCreated(await createProject({ name: name.trim(), slug: slug.trim() }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-overlay project-create-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form
        className="modal project-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-create-title"
        onSubmit={event => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="project-create-header">
          <h2 id="project-create-title">新しいプロジェクト</h2>
          <button
            type="button"
            className="project-create-close"
            aria-label="閉じる"
            disabled={busy}
            onClick={onClose}
          >
            <svg viewBox="0 0 12 12" aria-hidden focusable="false">
              <path d="M1 1l10 10M11 1 1 11" />
            </svg>
          </button>
        </div>
        <label className="project-create-field">
          <span>名前</span>
          <input
            ref={nameRef}
            value={name}
            maxLength={50}
            disabled={busy}
            onChange={event => setName(event.target.value)}
          />
        </label>
        <label className="project-create-field">
          <span>プロジェクト ID</span>
          <input
            value={slug}
            maxLength={40}
            disabled={busy}
            spellCheck={false}
            placeholder="quiet-signals"
            onChange={event => setSlug(event.target.value)}
          />
        </label>
        {error && (
          <p className="error project-create-error" role="alert">
            {error}
          </p>
        )}
        <div className="project-create-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            キャンセル
          </button>
          <button
            type="submit"
            className="primary"
            disabled={busy || !name.trim() || !slug.trim()}
          >
            作成
          </button>
        </div>
      </form>
    </div>
  );
}
