import { NextRequest, NextResponse } from 'next/server';
import { applyPaymentAction, findOrderByProviderCheckout } from '@/lib/payment-db';
import { assertProviderConfigured } from '@/lib/payment-providers';
import { retrieveStripeCheckout } from '@/lib/payment-server';
import { isPaymentConfirmed, parseStripeWebhookAction } from '@/lib/payments';
import { verifyPaymentStatusToken } from '@/lib/payment-status-token';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');
  const checkoutId = request.nextUrl.searchParams.get('checkout_id') || '';
  const statusToken = request.nextUrl.searchParams.get('status_token') || '';
  if (!['stripe', 'paypal'].includes(provider || '') || !/^[A-Za-z0-9_-]{5,255}$/.test(checkoutId)) {
    return NextResponse.json({ error: 'Referencia de pago inválida.' }, { status: 400 });
  }

  try {
    let order = await findOrderByProviderCheckout(checkoutId);
    if (!verifyPaymentStatusToken(statusToken, order.id, process.env.PAYMENT_STATUS_SECRET || '')) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
    if (provider === 'stripe') {
      const config = assertProviderConfigured('STRIPE', process.env);
      if (config.method !== 'STRIPE') throw new Error('Stripe configuration mismatch.');
      const session = await retrieveStripeCheckout(checkoutId, config);
      const action = parseStripeWebhookAction({ type: 'checkout.session.completed', data: { object: session } });
      await applyPaymentAction(action);
      order = await findOrderByProviderCheckout(checkoutId);
    }
    if (order.payment_method.toLowerCase() !== provider) {
      return NextResponse.json({ error: 'Referencia de pago inválida.' }, { status: 400 });
    }
    return NextResponse.json({
      orderNumber: order.order_number,
      paid: isPaymentConfirmed(order.payment_status),
    });
  } catch {
    return NextResponse.json({ error: 'No fue posible verificar el pago.' }, { status: 502 });
  }
}
