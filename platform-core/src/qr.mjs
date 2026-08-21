import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';

export function createQrCredential({ orderId, kind, publicBaseUrl, encryptionSecret, now = new Date() }) {
  if (!orderId || !kind) throw new Error('QR_DATA_REQUIRED');
  if (!encryptionSecret) throw new Error('QR_ENCRYPTION_SECRET_REQUIRED');
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashQrToken(token);
  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    id: randomUUID(),
    orderId,
    kind,
    tokenHash,
    tokenCiphertext: seal(token, encryptionSecret),
    payload: `${base}/validar/${token}`,
    status: 'valid',
    issuedAt: now.toISOString(),
    usedAt: null,
    revokedAt: null,
  };
}

export function recoverQrPayload({ credential, publicBaseUrl, encryptionSecret }) {
  if (!credential || credential.status === 'revoked') throw new Error('QR_NOT_AVAILABLE');
  const token = open(credential.tokenCiphertext, encryptionSecret);
  return `${publicBaseUrl.replace(/\/$/, '')}/validar/${token}`;
}

export function hashQrToken(token) {
  if (!token) throw new Error('QR_TOKEN_REQUIRED');
  return createHash('sha256').update(token).digest('hex');
}

function seal(value, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
}

function open(value, secret) {
  const parts = String(value).split('.');
  if (parts.length !== 3) throw new Error('QR_CIPHERTEXT_INVALID');
  const [iv, tag, encrypted] = parts.map((part) => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(secret), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function key(secret) {
  return createHash('sha256').update(secret).digest();
}
