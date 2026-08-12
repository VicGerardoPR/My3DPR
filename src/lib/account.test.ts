import { describe, expect, it } from 'vitest';
import { authCredentialsSchema, guestAccessSchema, publicOrderSchema } from './account';

describe('account security contracts', () => {
  it('rejects weak signup passwords', () => {
    expect(authCredentialsSchema.safeParse({ email: 'buyer@example.com', password: '12345' }).success).toBe(false);
  });

  it('normalizes verified guest access email', () => {
    expect(guestAccessSchema.parse({ email: ' Buyer@Example.COM ' })).toEqual({ email: 'buyer@example.com' });
  });

  it('never exposes internal order IDs or addresses in public order output', () => {
    const order = publicOrderSchema.parse({
      order_number: 'MY3D-2026-ABC12345', status: 'PAID', payment_status: 'PAID',
      total_amount: 24.99, currency: 'USD', items: [], created_at: '2026-08-12T00:00:00Z',
      tracking_number: null, carrier: null,
      id: 'private-id', shipping_address: { street: 'secret' }, guest_email: 'buyer@example.com',
    });
    expect(order).not.toHaveProperty('id');
    expect(order).not.toHaveProperty('shipping_address');
    expect(order).not.toHaveProperty('guest_email');
  });
});
