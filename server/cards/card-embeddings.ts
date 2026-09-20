import type { Card } from '../db/cards.js';

export type EmbeddedCard = Card & { embedding: string };

export function requireCardEmbeddings(
  cards: Card[],
  message: string
): asserts cards is EmbeddedCard[] {
  if (cards.some(card => !card.embedding)) throw new Error(message);
}
