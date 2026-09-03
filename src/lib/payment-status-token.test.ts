import { describe, expect, it } from 'vitest';
import { createPaymentStatusToken, verifyPaymentStatusToken } from './payment-status-token';

describe('payment status token', () => {
  const secret = 'a'.repeat(64);
  const now = Date.UTC(2026, 7, 15, 12, 0, 0);

  it('binds a short-lived token to one order', () => {
    const token = createPaymentStatusToken('order-123', secret, now, 15 * 60);
    expect(verifyPaymentStatusToken(token, 'order-123', secret, now + 60_000)).toBe(true);
    expect(verifyPaymentStatusToken(token, 'order-456', secret, now + 60_000)).toBe(false);
  });

  it('rejects tampering and expiration', () => {
    const token = createPaymentStatusToken('order-123', secret, now, 60);
    expect(verifyPaymentStatusToken(token + 'x', 'order-123', secret, now)).toBe(false);
    expect(verifyPaymentStatusToken(token, 'order-123', secret, now + 61_000)).toBe(false);
  });

  it('requires a strong dedicated secret', () => {
    expect(() => createPaymentStatusToken('order-123', 'short', now)).toThrow(/32/);
  });
});
