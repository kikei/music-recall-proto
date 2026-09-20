import { generatePublicId } from '../ids/public-id.js';
import { db } from './open.js';

export function newPublicId(
  table: 'cards' | 'sessions',
  projectId: string
): string {
  for (;;) {
    const value = generatePublicId();
    const found = db
      .prepare(`SELECT 1 FROM ${table} WHERE project_id = ? AND public_id = ?`)
      .get(projectId, value);
    if (!found) return value;
  }
}
