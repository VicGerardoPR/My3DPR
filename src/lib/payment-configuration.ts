import { canonicalSiteOrigin } from './payments';

type Environment = Record<string, string | undefined>;

// Reject the documentation sentinels instead of treating copied examples as secrets.
export function isConfiguredValue(value: string | undefined): value is string {
  return !!value && value === value.trim() && !/[\[\]<>]/.test(value);
}

export function assertCheckoutConfigured(env: Environment) {
  const siteOrigin = canonicalSiteOrigin(env.NEXT_PUBLIC_SITE_URL);
  for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!isConfiguredValue(env[key])) throw new Error(`${key} is not configured.`);
  }
  const databaseUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL!);
  if (!['http:', 'https:'].includes(databaseUrl.protocol)) throw new Error('Invalid database URL.');
  for (const key of ['PAYMENT_STATUS_SECRET', 'CRON_SECRET']) {
    if (!isConfiguredValue(env[key]) || env[key]!.length < 32) throw new Error(`${key} must be configured with at least 32 characters.`);
  }
  return siteOrigin;
}
