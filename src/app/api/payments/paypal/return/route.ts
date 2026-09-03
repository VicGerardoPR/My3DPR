import { NextRequest, NextResponse } from 'next/server';
import { applyPaymentAction, findOrderByProviderCheckout } from '@/lib/payment-db';
import { assertProviderConfigured } from '@/lib/payment-providers';
import { capturePayPalCheckout, PaymentProviderRequestError, retrievePayPalCheckout } from '@/lib/payment-server';
import { canonicalSiteOrigin, parsePayPalCapturedOrder } from '@/lib/payments';
import { verifyPaymentStatusToken } from '@/lib/payment-status-token';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang') === 'en' ? 'en' : 'es';
  const checkoutId = request.nextUrl.searchParams.get('token');
  const statusToken = request.nextUrl.searchParams.get('status_token') || '';
  let site: string;
  try { site = canonicalSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL); }
  catch { return NextResponse.json({ error: 'Configuración de pago inválida.' }, { status: 503 }); }
  const failure = new URL(`/${lang}/checkout?payment=failed`, site);
  if (!checkoutId || !/^[A-Za-z0-9-]{5,64}$/.test(checkoutId)) return NextResponse.redirect(failure);

  let config: ReturnType<typeof assertProviderConfigured>;
  try { config = assertProviderConfigured('PAYPAL', process.env); }
  catch { return NextResponse.redirect(failure); }
  if (config.method !== 'PAYPAL') return NextResponse.redirect(failure);

  try {
    const pendingOrder = await findOrderByProviderCheckout(checkoutId);
    if (!verifyPaymentStatusToken(statusToken, pendingOrder.id, process.env.PAYMENT_STATUS_SECRET || '')) {
      return NextResponse.redirect(failure);
    }
    let captured;
    try {
      captured = await capturePayPalCheckout(checkoutId, config);
    } catch (error) {
      if (!(error instanceof PaymentProviderRequestError) || error.status !== 422) throw error;
      captured = await retrievePayPalCheckout(checkoutId, config);
    }
    const action = parsePayPalCapturedOrder(captured);
    if (action.action !== 'PAID') return NextResponse.redirect(failure);
    await applyPaymentAction(action);
    return NextResponse.redirect(new URL(`/${lang}/checkout/success?provider=paypal&checkout_id=${encodeURIComponent(checkoutId)}&status_token=${encodeURIComponent(statusToken)}`, site));
  } catch {
    return NextResponse.redirect(failure);
  }
}
