import { db } from './open.js';

// Callers must invoke this function inside their transaction.
export function deleteProjectData(projectId: string): boolean {
  db.prepare(
    `DELETE FROM messages WHERE session_id IN
       (SELECT id FROM sessions WHERE project_id = ?)`
  ).run(projectId);
  db.prepare('DELETE FROM cards WHERE project_id = ?').run(projectId);
  db.prepare('DELETE FROM sessions WHERE project_id = ?').run(projectId);
  db.prepare('DELETE FROM project_members WHERE project_id = ?').run(projectId);
  return (
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId).changes === 1
  );
}
