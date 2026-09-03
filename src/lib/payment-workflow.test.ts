import { describe, expect, it } from 'vitest';
import { canRecoverIdempotentOrder, shouldFinalizeFailedClaim } from './payment-workflow';

describe('payment workflow guards', () => {
  it('only marks a webhook claim failed when this handler acquired it', () => {
    expect(shouldFinalizeFailedClaim(true)).toBe(true);
    expect(shouldFinalizeFailedClaim(false)).toBe(false);
  });

  it('recovers a concurrent idempotency conflict only for the same checkout owner and method', () => {
    const order = { guest_email: 'buyer@example.com', payment_method: 'STRIPE' };
    expect(canRecoverIdempotentOrder('23505', order, 'buyer@example.com', 'STRIPE')).toBe(true);
    expect(canRecoverIdempotentOrder('23505', order, 'other@example.com', 'STRIPE')).toBe(false);
    expect(canRecoverIdempotentOrder('23505', order, 'buyer@example.com', 'PAYPAL')).toBe(false);
    expect(canRecoverIdempotentOrder('500', order, 'buyer@example.com', 'STRIPE')).toBe(false);
  });
});
