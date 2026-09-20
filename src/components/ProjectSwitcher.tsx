import { useRef, useState } from 'react';
import type { Project } from '../api/projects.js';
import { NavLink } from './NavLink.js';
import { usePopoverMenu } from './usePopoverMenu.js';

export function ProjectSwitcher({
  projects,
  currentProject,
  onSelectProject,
  onCreate,
}: {
  projects: Project[];
  currentProject: Project;
  onSelectProject: (slug: string) => void;
  onCreate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { closeAndFocusTrigger, closeOnEscape } = usePopoverMenu({
    open,
    setOpen,
    containerRef: switcherRef,
    triggerRef,
  });

  return (
    <div
      className="project-switcher"
      ref={switcherRef}
      onKeyDown={closeOnEscape}
    >
      <button
        type="button"
        className="project-switcher-trigger"
        ref={triggerRef}
        title={currentProject.name}
        aria-label={`プロジェクト: ${currentProject.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
      >
        <span className="project-switcher-name">{currentProject.name}</span>
        <svg viewBox="0 0 12 8" aria-hidden focusable="false">
          <path d="m1 1 5 5 5-5" />
        </svg>
      </button>
      {open && (
        <div className="project-switcher-menu" role="menu">
          {projects.map(project => {
            const selected = project.slug === currentProject.slug;
            return (
              <button
                key={project.slug}
                type="button"
                className={
                  selected
                    ? 'project-switcher-option selected'
                    : 'project-switcher-option'
                }
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  closeAndFocusTrigger(() => {
                    if (!selected) onSelectProject(project.slug);
                  });
                }}
              >
                <span className="project-switcher-check" aria-hidden>
                  {selected ? '✓' : ''}
                </span>
                <span>{project.name}</span>
              </button>
            );
          })}
          <div className="project-switcher-divider" role="separator" />
          <NavLink
            className="project-switcher-option project-switcher-command"
            role="menuitem"
            to={{
              kind: 'project-settings',
              projectSlug: currentProject.slug,
            }}
            onBeforeNavigate={() => setOpen(false)}
          >
            <svg viewBox="0 0 12 12" aria-hidden focusable="false">
              <path d="M1 3h3m3 0h4M1 9h6m3 0h1" />
              <circle cx="5.5" cy="3" r="1.25" />
              <circle cx="8.5" cy="9" r="1.25" />
            </svg>
            <span>プロジェクト設定</span>
          </NavLink>
          <button
            type="button"
            className="project-switcher-option project-switcher-command"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onCreate();
            }}
          >
            <svg viewBox="0 0 12 12" aria-hidden focusable="false">
              <path d="M6 1v10M1 6h10" />
            </svg>
            <span>新しいプロジェクトを作成</span>
          </button>
        </div>
      )}
    </div>
  );
}
