import { RequestValidationError } from '../request-validation.js';

export type CardVisibility = 'private' | 'members' | 'public';

export const DEFAULT_CARD_VISIBILITY: CardVisibility = 'public';

export function checkVisibility(input: unknown): CardVisibility {
  if (input === 'private' || input === 'members' || input === 'public') {
    return input;
  }
  throw new RequestValidationError('公開範囲が正しくありません。');
}
