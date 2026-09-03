import { NextResponse } from 'next/server';
import { assertProviderConfigured } from '@/lib/payment-providers';

export async function GET() {
  let stripe = false;
  let paypal = false;
  try { assertProviderConfigured('STRIPE', process.env); stripe = true; } catch { /* not configured */ }
  try { assertProviderConfigured('PAYPAL', process.env); paypal = true; } catch { /* not configured */ }
  return NextResponse.json({ stripe, paypal });
}
