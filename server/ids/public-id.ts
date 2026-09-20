import { randomBytes } from 'node:crypto';

// Lowercase Crockford-like base32 without characters that are easy to confuse
// when a URL is read aloud or copied by hand.
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export function generatePublicId(length = 10): string {
  const bytes = randomBytes(length);
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}
