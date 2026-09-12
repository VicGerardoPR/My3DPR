import { NextResponse } from 'next/server';
import { assertProviderConfigured } from '@/lib/payment-providers';
import { assertCheckoutConfigured } from '@/lib/payment-configuration';

export async function GET() {
  let stripe = false;
  let paypal = false;
  try { assertCheckoutConfigured(process.env); assertProviderConfigured('STRIPE', process.env); stripe = true; } catch { /* not configured */ }
  try { assertCheckoutConfigured(process.env); assertProviderConfigured('PAYPAL', process.env); paypal = true; } catch { /* not configured */ }
  return NextResponse.json({ stripe, paypal }, { headers: { 'Cache-Control': 'no-store' } });
}
