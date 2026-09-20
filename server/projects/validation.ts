import { RequestValidationError } from '../request-validation.js';

const SLUG = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function checkProjectSlug(input: string): string {
  const slug = input.trim().toLowerCase();
  if (!SLUG.test(slug)) {
    throw new RequestValidationError(
      'プロジェクト ID は3〜40文字の英小文字・数字・ハイフンで入力してください。'
    );
  }
  return slug;
}

export function checkProjectName(input: string): string {
  const name = input.trim();
  if (!name) {
    throw new RequestValidationError('プロジェクト名を入力してください。');
  }
  if ([...name].length > 50) {
    throw new RequestValidationError(
      'プロジェクト名は50文字以内にしてください。'
    );
  }
  return name;
}
