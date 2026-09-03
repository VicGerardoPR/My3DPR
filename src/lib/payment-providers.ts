import { PaymentMethod, toMinorUnits } from './payments';

type Environment = Record<string, string | undefined>;
type CheckoutOrder = { id: string; orderNumber: string; email: string; total: number; currency: string };
type CheckoutUrls = { success: string; cancel: string; paypalReturn: string };

export function buildPayPalRequestId(orderId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new Error('PayPal request ID requires a UUID order ID.');
  }
  return orderId;
}

export function assertProviderConfigured(method: PaymentMethod, env: Environment) {
  if (method === 'STRIPE') {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe is not configured with secret and webhook credentials.');
    }
    if (env.STRIPE_ENVIRONMENT !== 'test') {
      throw new Error('Stripe environment must be explicitly set to test.');
    }
    if (!env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      throw new Error('Stripe test environment requires an sk_test_ secret key.');
    }
    return { method, environment: 'test', secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET } as const;
  }
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_WEBHOOK_ID) {
    throw new Error('PayPal is not configured with client and webhook credentials.');
  }
  if (env.PAYPAL_ENVIRONMENT !== 'sandbox' && env.PAYPAL_ENVIRONMENT !== 'live') {
    throw new Error('PayPal environment must be explicit: sandbox or live.');
  }
  return {
    method,
    clientId: env.PAYPAL_CLIENT_ID,
    clientSecret: env.PAYPAL_CLIENT_SECRET,
    webhookId: env.PAYPAL_WEBHOOK_ID,
    environment: env.PAYPAL_ENVIRONMENT,
  } as const;
}

export function buildStripeCheckoutParams(order: CheckoutOrder, urls: CheckoutUrls) {
  const successSeparator = urls.success.includes('?') ? '&' : '?';
  return {
    mode: 'payment' as const,
    payment_method_types: ['card'] as Array<'card'>,
    customer_email: order.email,
    client_reference_id: order.id,
    success_url: `${urls.success}${successSeparator}provider=stripe&checkout_id={CHECKOUT_SESSION_ID}`,
    cancel_url: urls.cancel,
    metadata: { order_id: order.id, order_number: order.orderNumber },
    payment_intent_data: { metadata: { order_id: order.id, order_number: order.orderNumber } },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: toMinorUnits(order.total),
        product_data: { name: `MY3D.PR — Orden ${order.orderNumber}` },
      },
    }],
  };
}

export function buildPayPalOrderPayload(order: CheckoutOrder, urls: CheckoutUrls) {
  return {
    intent: 'CAPTURE',
    purchase_units: [{
      reference_id: order.id,
      custom_id: order.id,
      invoice_id: order.orderNumber,
      description: `MY3D.PR — Orden ${order.orderNumber}`,
      amount: { currency_code: order.currency.toUpperCase(), value: order.total.toFixed(2) },
    }],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: 'MY3D.PR',
          return_url: urls.paypalReturn,
          cancel_url: urls.cancel,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      },
    },
  };
}

export function paypalApiBase(environment: string) {
  if (environment === 'sandbox') return 'https://api-m.sandbox.paypal.com';
  if (environment === 'live') return 'https://api-m.paypal.com';
  throw new Error('Invalid PayPal environment.');
}

export function shouldReleaseReservationAfterProviderFailure(
  checkoutId: string | null,
  method: PaymentMethod,
  providerSafelyClosed: boolean,
) {
  if (!checkoutId) return true;
  return method === 'STRIPE' && providerSafelyClosed;
}
