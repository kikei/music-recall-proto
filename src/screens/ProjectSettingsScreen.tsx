import { useEffect, useState } from 'react';
import type { CardVisibility } from '../api/cards.js';
import { deleteProject, updateProject, type Project } from '../api/projects.js';

export function ProjectSettingsScreen({
  project,
  canDeleteProject,
  onProjectChanged,
  onProjectDeleted,
}: {
  project: Project;
  canDeleteProject: boolean;
  onProjectChanged: (next: Project) => void;
  onProjectDeleted: (remaining: Project[]) => void;
}) {
  const [error, setError] = useState('');
  const [name, setName] = useState(project.name);
  const [slug, setSlug] = useState(project.slug);
  const [visibility, setVisibility] = useState<CardVisibility>(
    project.defaultVisibility
  );
  const [busy, setBusy] = useState(false);
  const canManage = project.role === 'owner';

  useEffect(() => {
    setName(project.name);
    setSlug(project.slug);
    setVisibility(project.defaultVisibility);
  }, [project]);

  async function save() {
    const changesSlug = canManage && slug.trim().toLowerCase() !== project.slug;
    if (
      changesSlug &&
      !window.confirm(
        'プロジェクト ID を変更すると、これまでのカードとセッションの URL はアクセスできなくなります。変更しますか?'
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      onProjectChanged(
        await updateProject(project.slug, {
          name,
          slug: canManage ? slug : undefined,
          defaultVisibility: visibility,
        })
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `プロジェクト「${project.name}」を削除します。含まれるカードとセッションもすべて削除され、元に戻せません。削除しますか?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      onProjectDeleted(await deleteProject(project.slug));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  const changed =
    canManage &&
    (name.trim() !== project.name ||
      slug.trim().toLowerCase() !== project.slug ||
      visibility !== project.defaultVisibility);

  return (
    <div className="settings">
      {error && <p className="error">{error}</p>}
      <h2>プロジェクト設定</h2>
      <section className="key-group first">
        <div className="key-fields project-fields">
          <label className="key-row">
            <span className="key-label">名前</span>
            <input
              value={name}
              maxLength={50}
              disabled={!canManage}
              onChange={event => setName(event.target.value)}
            />
          </label>
          <label className="key-row">
            <span className="key-label">プロジェクト ID</span>
            {canManage ? (
              <input
                value={slug}
                maxLength={40}
                spellCheck={false}
                onChange={event => setSlug(event.target.value)}
              />
            ) : (
              <code className="project-id">{project.slug}</code>
            )}
          </label>
          {canManage && (
            <p className="hint project-id-hint">
              URL に使う ID です。変更すると、以前のカードとセッションの URL
              はアクセスできなくなります。
            </p>
          )}
          <label className="project-private-toggle">
            <span>新しいカードをデフォルトで非表示にする</span>
            <input
              type="checkbox"
              checked={visibility !== 'public'}
              disabled={!canManage}
              onChange={event =>
                setVisibility(event.target.checked ? 'private' : 'public')
              }
            />
          </label>
        </div>
        <div className="key-actions">
          <button
            className="key-button primary"
            disabled={busy || !changed}
            onClick={save}
          >
            保存
          </button>
        </div>
      </section>
      {canManage && (
        <section className="key-group project-delete">
          <div className="project-delete-copy">
            <div className="key-title">プロジェクトの削除</div>
            <p className="hint project-delete-warning">
              カードとセッションを含むすべてのデータを完全に削除します。削除後は復元できません。
            </p>
            {!canDeleteProject && (
              <p className="hint project-delete-unavailable">
                最後のプロジェクトは削除できません。
              </p>
            )}
          </div>
          <button
            className="key-button danger project-delete-button"
            disabled={busy || !canDeleteProject}
            onClick={remove}
          >
            {project.name}を削除する
          </button>
        </section>
      )}
    </div>
  );
}
