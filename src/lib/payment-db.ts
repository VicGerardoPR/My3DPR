import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { PaymentAction } from './payments';

export function paymentDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Payment database is not configured.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function attachPaymentProvider(orderId: string, method: 'STRIPE' | 'PAYPAL', checkoutId: string) {
  const db = paymentDatabase();
  const { data, error } = await db.rpc('attach_order_payment_provider', {
    p_order_id: orderId,
    p_payment_method: method,
    p_provider_checkout_id: checkoutId,
  });
  if (error) throw new Error(`Could not attach payment provider: ${error.code}`);
  return Array.isArray(data) ? data[0] : data;
}

export async function releaseOrderInventory(orderId: string) {
  const { error } = await paymentDatabase().rpc('release_order_inventory', { p_order_id: orderId });
  if (error && !error.message.includes('current state')) throw new Error(`Could not release order inventory: ${error.code}`);
}

export async function consumeCheckoutRateLimit(bucket: string, limit: number, windowSeconds = 60) {
  const { data, error } = await paymentDatabase().rpc('consume_checkout_rate_limit', {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(`Could not consume checkout rate limit: ${error.code}`);
  return data === true;
}

export async function findOrderByIdempotencyKey(idempotencyKey: string) {
  const { data, error } = await paymentDatabase().from('orders')
    .select('id,order_number,guest_email,total_amount,currency,status,payment_status,payment_method,provider_checkout_id')
    .eq('idempotency_key', idempotencyKey)
    .single();
  if (error) return null;
  return data;
}

export async function applyPaymentAction(action: PaymentAction) {
  if (action.action === 'IGNORE') return null;
  const db = paymentDatabase();
  if (action.action === 'PAID') {
    const { data, error } = await db.rpc('complete_order_payment', {
      p_provider_checkout_id: action.checkoutId,
      p_provider_payment_id: action.paymentId,
      p_amount: action.amount,
      p_currency: action.currency,
    });
    if (error) throw new Error(`Could not complete payment: ${error.code}`);
    return Array.isArray(data) ? data[0] : data;
  }
  if (action.action === 'CANCEL') {
    const { error } = await db.rpc('cancel_order_payment', { p_provider_checkout_id: action.checkoutId });
    if (error) throw new Error(`Could not cancel payment: ${error.code}`);
    return null;
  }
  const { data, error } = await db.rpc('record_order_refund', {
    p_provider: action.provider,
    p_event_id: action.eventId,
    p_provider_payment_id: action.paymentId,
    p_refund_amount: action.amount,
    p_currency: action.currency,
    p_is_cumulative: action.mode === 'ABSOLUTE',
  });
  if (error) throw new Error(`Could not record refund: ${error.code}`);
  return Array.isArray(data) ? data[0] : data;
}

export async function claimPaymentEvent(provider: 'STRIPE' | 'PAYPAL', eventId: string, eventType: string) {
  const { data, error } = await paymentDatabase().rpc('claim_payment_event', {
    p_provider: provider,
    p_event_id: eventId,
    p_event_type: eventType,
  });
  if (error) throw new Error(`Could not claim payment event: ${error.code}`);
  return data === true;
}

export async function paymentEventStatus(provider: 'STRIPE' | 'PAYPAL', eventId: string) {
  const { data, error } = await paymentDatabase().from('payment_events')
    .select('status')
    .eq('provider', provider)
    .eq('event_id', eventId)
    .single();
  if (error) throw new Error(`Could not read payment event: ${error.code}`);
  return data.status as 'PROCESSING' | 'PROCESSED' | 'FAILED';
}

export async function finishPaymentEvent(provider: 'STRIPE' | 'PAYPAL', eventId: string, success: boolean, errorMessage?: string) {
  const { error } = await paymentDatabase().rpc('finish_payment_event', {
    p_provider: provider,
    p_event_id: eventId,
    p_success: success,
    p_error: errorMessage || null,
  });
  if (error) throw new Error(`Could not finish payment event: ${error.code}`);
}

export async function claimExpiredPaymentOrders(limit = 50) {
  const { data, error } = await paymentDatabase().rpc('claim_expired_payment_orders', { p_limit: limit });
  if (error) throw new Error(`Could not claim expired payments: ${error.code}`);
  return data || [];
}

export async function findOrderByProviderCheckout(checkoutId: string) {
  const { data, error } = await paymentDatabase().from('orders')
    .select('id,order_number,status,payment_status,total_amount,currency,payment_method,provider_checkout_id')
    .eq('provider_checkout_id', checkoutId)
    .single();
  if (error) throw new Error(`Payment order not found: ${error.code}`);
  return data;
}
