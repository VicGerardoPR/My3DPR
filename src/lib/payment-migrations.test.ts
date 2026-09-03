import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('payment migration contracts', () => {
  it('treats partially refunded payments as terminal for repeated payment confirmation', () => {
    const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260815060000_payment_confirmation_idempotency.sql'), 'utf8');
    expect(sql).toContain("payment_status IN ('PAID','PARTIALLY_REFUNDED','REFUNDED')");
    expect(sql).toContain('payment id mismatch');
  });

  it('assigns reservation expiry before an external checkout can be attached', () => {
    const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260815070000_orphan_reservation_expiry.sql'), 'utf8');
    expect(sql).toContain('BEFORE INSERT');
    expect(sql).toContain("WHEN 'STRIPE' THEN now() + interval '35 minutes'");
    expect(sql).toContain("WHEN 'PAYPAL' THEN now() + interval '3 hours 15 minutes'");
  });

  it('uses a durable database rate limiter for checkout reservations', () => {
    const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260815080000_checkout_rate_limits.sql'), 'utf8');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.checkout_rate_limits');
    expect(sql).toContain('consume_checkout_rate_limit');
    expect(sql).toContain('ON CONFLICT (bucket) DO UPDATE');
  });

  it('claims expired reservations with skip locked and durable backoff', () => {
    const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260815090000_payment_reconciliation_claims.sql'), 'utf8');
    expect(sql).toContain('claim_expired_payment_orders');
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('payment_reconcile_after');
    expect(sql).toContain('payment_reconcile_attempts');
  });

  it('runs payment reconciliation every five minutes', () => {
    const config = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8');
    expect(config).toContain('*/5 * * * *');
  });
});
