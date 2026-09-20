import type { Card } from './cards.js';
import { getProjectRole } from './projects.js';

export const READABLE_CARD_SQL = `(
  created_by_user_id = ?
  OR visibility = 'public'
  OR (visibility = 'members' AND EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = cards.project_id AND pm.user_id = ?
  ))
)`;

export function isCardCreator(card: Card, actorUserId: string): boolean {
  return card.created_by_user_id === actorUserId;
}

export function canReadCard(card: Card, actorUserId: string): boolean {
  if (isCardCreator(card, actorUserId)) return true;
  if (card.visibility === 'private') return false;
  if (card.visibility === 'public') return true;
  if (card.visibility === 'members') {
    return getProjectRole(card.project_id, actorUserId) !== undefined;
  }
  return false;
}

export function canEditCard(card: Card, actorUserId: string): boolean {
  return isCardCreator(card, actorUserId);
}

export function selectOwnBaseCard(
  card: Card | undefined,
  actorUserId: string
): Card | undefined {
  return card && isCardCreator(card, actorUserId) ? card : undefined;
}
