import { randomBytes } from 'node:crypto';

// The name shown for an account. It is a label, nothing more: it is never
// resolved, compared or put in a URL, so it needs no uniqueness and no
// character rules: any script, any punctuation, an emoji.
//
// That is a deliberate split. Identifiers have to be restricted, and doing that
// well across scripts is genuinely hard (confusable characters, combining
// marks, bidirectional overrides). Rather than approximate it here, anything
// that must be an identifier later -- a shareable project id, say -- gets its
// own alphanumeric field where the character set is ours to choose.
//
// What is left out is only what would break the rendering of the name itself.
const CONTROL = /\p{Cc}|\p{Cs}/u;
// Overrides that reorder surrounding text, which is how a name can be made to
// display as something other than what it says.
const BIDI_OVERRIDE = /[‪-‮⁦-⁩]/u;
const MAX_LENGTH = 30;

// Ambiguous characters (0/o, 1/l) are left out so a generated name can be read
// aloud or copied by hand without confusion.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

// New accounts start with a name rather than a blank, so nothing in the UI has
// to handle "no name yet".
export function generateDisplayName(): string {
  const bytes = randomBytes(6);
  let suffix = '';
  for (const byte of bytes) suffix += ALPHABET[byte % ALPHABET.length];
  return `user-${suffix}`;
}

// Returns the cleaned name, or a reason it cannot be used.
export function checkDisplayName(
  input: string
): { displayName: string } | { error: string } {
  const displayName = input.trim();
  if (!displayName) {
    return { error: '名前を入力してください' };
  }
  if ([...displayName].length > MAX_LENGTH) {
    return { error: `名前は ${MAX_LENGTH} 文字以内にしてください` };
  }
  if (CONTROL.test(displayName) || BIDI_OVERRIDE.test(displayName)) {
    return { error: 'その名前には使えない文字が含まれています' };
  }
  return { displayName };
}
