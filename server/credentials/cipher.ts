import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Encryption for the third-party API keys people entrust to us. Stored
// encrypted so a leaked database file is not a leaked set of keys, using
// AES-256-GCM: the tag detects tampering, so a modified row fails to decrypt
// rather than silently returning altered bytes.
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

// The master key is deployment state, so it lives in the environment. Losing it
// means the stored keys cannot be read back and each person re-enters theirs;
// there is deliberately no recovery path, since a recoverable key is one an
// attacker can recover too.
function masterKey(): Buffer {
  const raw = process.env.CREDENTIAL_SECRET;
  if (!raw) {
    throw new Error(
      'CREDENTIAL_SECRET が未設定です。.env に設定してください。'
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error(
      'CREDENTIAL_SECRET は base64 で 32 バイトの値にしてください ' +
        '(openssl rand -base64 32 で生成できます)。'
    );
  }
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

export function decryptSecret(stored: string): string {
  const buffer = Buffer.from(stored, 'base64');
  const iv = buffer.subarray(0, IV_BYTES);
  const tag = buffer.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const body = buffer.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(ALGORITHM, masterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString(
    'utf8'
  );
}
