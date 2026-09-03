import { NextRequest, NextResponse } from 'next/server';
import { applyPaymentAction, claimExpiredPaymentOrders, releaseOrderInventory } from '@/lib/payment-db';
import { assertProviderConfigured } from '@/lib/payment-providers';
import {
  capturePayPalCheckout,
  expireStripeCheckout,
  PaymentProviderRequestError,
  retrievePayPalCheckout,
  retrieveStripeCheckout,
} from '@/lib/payment-server';
import { parsePayPalCapturedOrder, parseStripeWebhookAction } from '@/lib/payments';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ExpiredOrder = {
  id: string;
  payment_method: 'STRIPE' | 'PAYPAL';
  provider_checkout_id: string | null;
};
type ReconcileResult = 'reconciled' | 'pending' | 'failed';

async function reconcileOrder(order: ExpiredOrder): Promise<ReconcileResult> {
  const checkoutId = order.provider_checkout_id;
  try {
    if (!checkoutId) {
      await releaseOrderInventory(order.id);
      return 'reconciled';
    }
    if (order.payment_method === 'STRIPE') {
      const config = assertProviderConfigured('STRIPE', process.env);
      if (config.method !== 'STRIPE') throw new Error('Stripe configuration mismatch.');
      const session = await retrieveStripeCheckout(checkoutId, config);
      const action = parseStripeWebhookAction({ type: 'checkout.session.completed', data: { object: session } });
      if (action.action === 'PAID') {
        await applyPaymentAction(action);
        return 'reconciled';
      }
      if (session.status === 'expired' || (session.status === 'open' && await expireStripeCheckout(checkoutId, config))) {
        await applyPaymentAction({ action: 'CANCEL', checkoutId });
        return 'reconciled';
      }
      return 'pending';
    }

    const config = assertProviderConfigured('PAYPAL', process.env);
    if (config.method !== 'PAYPAL') throw new Error('PayPal configuration mismatch.');
    let providerOrder = await retrievePayPalCheckout(checkoutId, config) as { status?: string };
    if (providerOrder.status === 'APPROVED') providerOrder = await capturePayPalCheckout(checkoutId, config) as { status?: string };
    const action = parsePayPalCapturedOrder(providerOrder);
    if (action.action === 'PAID') {
      await applyPaymentAction(action);
      return 'reconciled';
    }
    if (providerOrder.status === 'VOIDED') {
      await applyPaymentAction({ action: 'CANCEL', checkoutId });
      return 'reconciled';
    }
    return 'pending';
  } catch (error) {
    if (checkoutId && order.payment_method === 'PAYPAL' && error instanceof PaymentProviderRequestError && error.status === 404) {
      try {
        await applyPaymentAction({ action: 'CANCEL', checkoutId });
        return 'reconciled';
      } catch { /* durable claim backoff handles retry */ }
    }
    return 'failed';
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || '';
  if (cronSecret.length < 32 || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const deadline = Date.now() + 50_000;
  const totals = { inspected: 0, reconciled: 0, pending: 0, failed: 0 };

  while (Date.now() < deadline && totals.inspected < 500) {
    const orders = await claimExpiredPaymentOrders(50) as ExpiredOrder[];
    if (orders.length === 0) break;
    totals.inspected += orders.length;

    for (let offset = 0; offset < orders.length; offset += 10) {
      const results = await Promise.all(orders.slice(offset, offset + 10).map(reconcileOrder));
      for (const result of results) totals[result] += 1;
    }
    if (orders.length < 50) break;
  }

  return NextResponse.json(totals);
}
