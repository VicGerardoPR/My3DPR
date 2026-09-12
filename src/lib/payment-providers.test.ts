import { describe, expect, it } from 'vitest';
import {
  assertProviderConfigured,
  buildPayPalOrderPayload,
  buildPayPalRequestId,
  buildStripeCheckoutParams,
  paypalApiBase,
  shouldReleaseReservationAfterProviderFailure,
} from './payment-providers';

const order = { id: 'order-id', orderNumber: 'MY3D-2026-ABC', email: 'buyer@example.com', total: 12.34, currency: 'USD' };
const urls = {
  success: 'https://www.my3dpr.site/es/checkout/success',
  cancel: 'https://www.my3dpr.site/es/checkout?payment=cancelled',
  paypalReturn: 'https://www.my3dpr.site/api/payments/paypal/return?lang=es',
};

describe('provider configuration and payloads', () => {
  it('fails closed when provider secrets are absent', () => {
    expect(() => assertProviderConfigured('STRIPE', {})).toThrow(/Stripe/i);
    expect(() => assertProviderConfigured('PAYPAL', {})).toThrow(/PayPal/i);
  });

  it('only enables Stripe with an explicit test environment and a test secret key', () => {
    const base = { STRIPE_WEBHOOK_SECRET: 'whsec_test' };
    expect(() => assertProviderConfigured('STRIPE', { ...base, STRIPE_SECRET_KEY: 'sk_test_example' })).toThrow(/environment/i);
    expect(() => assertProviderConfigured('STRIPE', { ...base, STRIPE_SECRET_KEY: 'sk_live_example', STRIPE_ENVIRONMENT: 'test' })).toThrow(/test/i);
    expect(() => assertProviderConfigured('STRIPE', { ...base, STRIPE_SECRET_KEY: 'sk_live_example', STRIPE_ENVIRONMENT: 'live' })).toThrow(/test/i);
    expect(assertProviderConfigured('STRIPE', { ...base, STRIPE_SECRET_KEY: 'sk_test_example', STRIPE_ENVIRONMENT: 'test' }))
      .toMatchObject({ method: 'STRIPE', environment: 'test' });
  });

  it('requires both PayPal credentials and an explicit environment', () => {
    expect(() => assertProviderConfigured('PAYPAL', { PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_WEBHOOK_ID: 'hook' })).toThrow(/environment/i);
    expect(assertProviderConfigured('PAYPAL', { PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 'secret', PAYPAL_ENVIRONMENT: 'sandbox', PAYPAL_WEBHOOK_ID: 'hook' }))
      .toMatchObject({ environment: 'sandbox', webhookId: 'hook' });
  });

  it('builds a Stripe Checkout session from the server total and limits Stripe to cards and wallets', () => {
    expect(buildStripeCheckoutParams(order, urls)).toMatchObject({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: 'buyer@example.com',
      client_reference_id: 'order-id',
      success_url: 'https://www.my3dpr.site/es/checkout/success?provider=stripe&checkout_id={CHECKOUT_SESSION_ID}',
      cancel_url: urls.cancel,
      metadata: { order_id: 'order-id', order_number: 'MY3D-2026-ABC' },
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: 1234 } }],
    });
  });

  it('builds a PayPal order from the server total and returns to the verified callback', () => {
    expect(buildPayPalOrderPayload(order, urls)).toMatchObject({
      intent: 'CAPTURE',
      purchase_units: [{ custom_id: 'order-id', invoice_id: 'MY3D-2026-ABC', amount: { currency_code: 'USD', value: '12.34' } }],
      payment_source: { paypal: { experience_context: {
        return_url: urls.paypalReturn,
        cancel_url: urls.cancel,
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      } } },
    });
  });

  it('builds a stable PayPal request ID within the 38 character API limit', () => {
    const orderId = '123e4567-e89b-12d3-a456-426614174000';
    expect(buildPayPalRequestId(orderId)).toBe(orderId);
    expect(buildPayPalRequestId(orderId).length).toBeLessThanOrEqual(38);
  });

  it('selects only the explicit PayPal sandbox API origin', () => {
    expect(paypalApiBase('sandbox')).toBe('https://api-m.sandbox.paypal.com');
    expect(() => paypalApiBase('live')).toThrow(/sandbox/i);
    expect(() => paypalApiBase('other')).toThrow(/environment/i);
  });

  it('never releases inventory while an external checkout might still accept payment', () => {
    expect(shouldReleaseReservationAfterProviderFailure(null, 'STRIPE', false)).toBe(true);
    expect(shouldReleaseReservationAfterProviderFailure('cs_test_open', 'STRIPE', false)).toBe(false);
    expect(shouldReleaseReservationAfterProviderFailure('cs_test_expired', 'STRIPE', true)).toBe(true);
    expect(shouldReleaseReservationAfterProviderFailure('PAYPAL-OPEN', 'PAYPAL', false)).toBe(false);
  });
});
