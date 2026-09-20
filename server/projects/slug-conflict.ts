import { RequestValidationError } from '../request-validation.js';

export function withProjectSlugConflict<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('UNIQUE constraint failed: projects.slug')
    ) {
      throw new RequestValidationError(
        'そのプロジェクト ID はすでに使われています。'
      );
    }
    throw error;
  }
}
