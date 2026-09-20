import { tryDeleteOwnedProject } from '../db/projects.js';
import { RequestValidationError } from '../request-validation.js';

const LAST_PROJECT_MESSAGE = '最後のプロジェクトは削除できません。';

// Delete a project the user owns. Returns false when nothing was deleted, and
// throws a validation error when it is the user's last project.
export function deleteProjectOrThrow(
  projectId: string,
  userId: string
): boolean {
  const result = tryDeleteOwnedProject(projectId, userId);
  if (result === 'last-project') {
    throw new RequestValidationError(LAST_PROJECT_MESSAGE);
  }
  return result === 'deleted';
}
