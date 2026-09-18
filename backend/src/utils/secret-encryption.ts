import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

const getKey = (): Buffer => {
  const rawKey = process.env.AUTH_ENCRYPTION_KEY;

  if (!rawKey || !/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error('AUTH_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)');
  }

  return Buffer.from(rawKey, 'hex');
};

export const encryptSecret = (value: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString(
    'base64url',
  )}`;
};

export const decryptSecret = (value: string): string => {
  const [ivEncoded, tagEncoded, encryptedEncoded] = value.split('.');

  if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Invalid encrypted secret');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivEncoded, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};
