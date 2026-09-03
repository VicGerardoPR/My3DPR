import { createHmac, timingSafeEqual } from 'node:crypto';

function assertSecret(secret: string) {
  if (secret.length < 32) throw new Error('PAYMENT_STATUS_SECRET must contain at least 32 characters.');
}

export function createPaymentStatusToken(orderId: string, secret: string, now = Date.now(), ttlSeconds = 15 * 60) {
  assertSecret(secret);
  const payload = Buffer.from(JSON.stringify({ orderId, expiresAt: Math.floor(now / 1000) + ttlSeconds })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyPaymentStatusToken(token: string, orderId: string, secret: string, now = Date.now()) {
  try {
    assertSecret(secret);
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return false;
    const expected = createHmac('sha256', secret).update(payload).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { orderId?: string; expiresAt?: number };
    return parsed.orderId === orderId && typeof parsed.expiresAt === 'number' && parsed.expiresAt >= Math.floor(now / 1000);
  } catch {
    return false;
  }
}
