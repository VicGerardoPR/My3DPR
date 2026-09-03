import 'server-only';

import Stripe from 'stripe';
import { buildPayPalOrderPayload, buildPayPalRequestId, buildStripeCheckoutParams, paypalApiBase } from './payment-providers';

type CheckoutOrder = { id: string; orderNumber: string; email: string; total: number; currency: string };
type CheckoutUrls = { success: string; cancel: string; paypalReturn: string };
type StripeConfig = { secretKey: string; webhookSecret: string };
type PayPalConfig = { clientId: string; clientSecret: string; webhookId: string; environment: 'sandbox' | 'live' };

export class PaymentProviderRequestError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'PaymentProviderRequestError';
  }
}

export function stripeClient(secretKey: string) {
  return new Stripe(secretKey, { maxNetworkRetries: 2, timeout: 20_000 });
}

export async function createStripeCheckout(order: CheckoutOrder, urls: CheckoutUrls, config: StripeConfig) {
  const stripe = stripeClient(config.secretKey);
  const params = { ...buildStripeCheckoutParams(order, urls), expires_at: Math.floor(Date.now() / 1000) + 31 * 60 };
  const session = await stripe.checkout.sessions.create(params, {
    idempotencyKey: `checkout-${order.id}`,
  });
  if (!session.url) throw new Error('Stripe did not return a Checkout URL.');
  return { checkoutId: session.id, redirectUrl: session.url };
}

export async function retrieveStripeCheckout(checkoutId: string, config: StripeConfig) {
  const session = await stripeClient(config.secretKey).checkout.sessions.retrieve(checkoutId);
  return session;
}

export async function expireStripeCheckout(checkoutId: string, config: StripeConfig) {
  try {
    const session = await stripeClient(config.secretKey).checkout.sessions.expire(checkoutId);
    return session.status === 'expired';
  } catch {
    return false;
  }
}

export function constructStripeEvent(rawBody: string, signature: string, config: StripeConfig) {
  return stripeClient(config.secretKey).webhooks.constructEvent(rawBody, signature, config.webhookSecret);
}

async function paypalAccessToken(config: PayPalConfig) {
  const response = await fetch(`${paypalApiBase(config.environment)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null) as { access_token?: string } | null;
  if (!response.ok || !data?.access_token) throw new Error('PayPal authentication failed.');
  return data.access_token;
}

async function paypalRequest(config: PayPalConfig, path: string, init: RequestInit = {}) {
  const token = await paypalAccessToken(config);
  const response = await fetch(`${paypalApiBase(config.environment)}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new PaymentProviderRequestError(response.status, `PayPal request failed with HTTP ${response.status}.`);
  return data;
}

function paypalApprovalUrl(order: unknown) {
  const links = (order as { links?: Array<{ rel?: string; href?: string }> })?.links || [];
  return links.find((link) => link.rel === 'payer-action' || link.rel === 'approve')?.href;
}

export async function createPayPalCheckout(order: CheckoutOrder, urls: CheckoutUrls, config: PayPalConfig) {
  const data = await paypalRequest(config, '/v2/checkout/orders', {
    method: 'POST',
    headers: { 'PayPal-Request-Id': buildPayPalRequestId(order.id), Prefer: 'return=representation' },
    body: JSON.stringify(buildPayPalOrderPayload(order, urls)),
  });
  const redirectUrl = paypalApprovalUrl(data);
  const checkoutId = (data as { id?: string })?.id;
  if (!checkoutId || !redirectUrl) throw new Error('PayPal did not return an approval URL.');
  return { checkoutId, redirectUrl };
}

export async function retrievePayPalCheckout(checkoutId: string, config: PayPalConfig) {
  return paypalRequest(config, `/v2/checkout/orders/${encodeURIComponent(checkoutId)}`);
}

export async function retrievePayPalRedirect(checkoutId: string, config: PayPalConfig) {
  const order = await retrievePayPalCheckout(checkoutId, config);
  const redirectUrl = paypalApprovalUrl(order);
  if (!redirectUrl) throw new Error('PayPal order is no longer approvable.');
  return redirectUrl;
}

export async function capturePayPalCheckout(checkoutId: string, config: PayPalConfig) {
  return paypalRequest(config, `/v2/checkout/orders/${encodeURIComponent(checkoutId)}/capture`, {
    method: 'POST',
    headers: { 'PayPal-Request-Id': `capture-${checkoutId}`, Prefer: 'return=representation' },
    body: '{}',
  });
}

export async function verifyPayPalWebhook(headers: Headers, event: unknown, config: PayPalConfig) {
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certUrl = headers.get('paypal-cert-url');
  const authAlgo = headers.get('paypal-auth-algo');
  const transmissionSig = headers.get('paypal-transmission-sig');
  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;
  const result = await paypalRequest(config, '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: config.webhookId,
      webhook_event: event,
    }),
  }) as { verification_status?: string };
  return result.verification_status === 'SUCCESS';
}
