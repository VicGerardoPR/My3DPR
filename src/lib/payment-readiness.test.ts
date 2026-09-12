import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/payments/config/route';
import { assertProviderConfigured, paypalApiBase } from './payment-providers';

const sandbox = {
  PAYPAL_CLIENT_ID: 'sandbox-client', PAYPAL_CLIENT_SECRET: 'sandbox-secret',
  PAYPAL_WEBHOOK_ID: 'sandbox-hook', PAYPAL_ENVIRONMENT: 'sandbox',
};
const configured = {
  ...sandbox,
  STRIPE_SECRET_KEY: ['sk', 'test', 'fixture'].join('_'), STRIPE_WEBHOOK_SECRET: 'whsec_fixture', STRIPE_ENVIRONMENT: 'test',
  NEXT_PUBLIC_SITE_URL: 'https://www.my3dpr.site', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-fixture', SUPABASE_SERVICE_ROLE_KEY: 'service-fixture',
  PAYMENT_STATUS_SECRET: 's'.repeat(40), CRON_SECRET: 'c'.repeat(40),
};

describe('test-only checkout readiness', () => {
  beforeEach(() => { for (const [key, value] of Object.entries(configured)) vi.stubEnv(key, value); });
  afterEach(() => vi.unstubAllEnvs());

  it('rejects PayPal live even with credentials', () => {
    expect(() => assertProviderConfigured('PAYPAL', { ...sandbox, PAYPAL_ENVIRONMENT: 'live' })).toThrow(/sandbox/i);
    expect(() => paypalApiBase('live')).toThrow(/sandbox/i);
  });
  it.each(['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'])('rejects copied placeholders: %s', (key) => {
    expect(() => assertProviderConfigured('PAYPAL', { ...sandbox, [key]: '[REQUIRED_SERVER_ONLY_FOR_PAYPAL]' })).toThrow();
    expect(() => assertProviderConfigured('PAYPAL', { ...sandbox, [key]: '   ' })).toThrow();
  });
  it('rejects a Stripe webhook placeholder', () => {
    expect(() => assertProviderConfigured('STRIPE', { ...configured, STRIPE_WEBHOOK_SECRET: '[REQUIRED_SERVER_ONLY_FOR_STRIPE]' })).toThrow();
  });
  it('advertises sandbox providers only with checkout prerequisites', async () => {
    expect(await (await GET()).json()).toEqual({ stripe: true, paypal: true });
  });
  it.each(['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'PAYMENT_STATUS_SECRET', 'CRON_SECRET'])('disables both providers when %s is absent', async (key) => {
    vi.stubEnv(key, '');
    expect(await (await GET()).json()).toEqual({ stripe: false, paypal: false });
  });
  it('does not accept a placeholder status signing secret', async () => {
    vi.stubEnv('PAYMENT_STATUS_SECRET', '[REQUIRED_SERVER_ONLY_MIN_32_CHARS]');
    expect(await (await GET()).json()).toEqual({ stripe: false, paypal: false });
  });
  it('does not accept an invalid database URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '[REQUIRED]');
    expect(await (await GET()).json()).toEqual({ stripe: false, paypal: false });
  });
  it('does not expose credentials or permit caching config responses', async () => {
    const response = await GET();
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(Object.keys(await response.json()).sort()).toEqual(['paypal', 'stripe']);
  });
});
