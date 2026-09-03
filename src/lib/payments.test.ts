import { describe, expect, it } from 'vitest';
import {
  buildCheckoutUrls,
  canonicalSiteOrigin,
  isPaymentConfirmed,
  parsePayPalCapturedOrder,
  parsePayPalWebhookAction,
  parseStripeWebhookAction,
  paymentMethodSchema,
  toMinorUnits,
} from './payments';

describe('payment contracts', () => {
  it('keeps captured payments confirmed after partial or full refunds', () => {
    expect(isPaymentConfirmed('PAID')).toBe(true);
    expect(isPaymentConfirmed('PARTIALLY_REFUNDED')).toBe(true);
    expect(isPaymentConfirmed('REFUNDED')).toBe(true);
    expect(isPaymentConfirmed('PENDING')).toBe(false);
    expect(isPaymentConfirmed('FAILED')).toBe(false);
  });
  it('accepts Stripe and PayPal but rejects legacy manual methods', () => {
    expect(paymentMethodSchema.parse('STRIPE')).toBe('STRIPE');
    expect(paymentMethodSchema.parse('PAYPAL')).toBe('PAYPAL');
    expect(paymentMethodSchema.safeParse('LEGACY_MANUAL').success).toBe(false);
  });

  it('converts trusted USD totals to integer cents', () => {
    expect(toMinorUnits(12.34)).toBe(1234);
    expect(toMinorUnits(0.5)).toBe(50);
    expect(() => toMinorUnits(0)).toThrow(/positive/i);
    expect(() => toMinorUnits(Number.NaN)).toThrow(/finite/i);
  });

  it('maps a paid Stripe Checkout event to a verified payment transition', () => {
    expect(parseStripeWebhookAction({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123', payment_status: 'paid', payment_intent: 'pi_123', amount_total: 1234, currency: 'usd' } },
    })).toEqual({ action: 'PAID', checkoutId: 'cs_test_123', paymentId: 'pi_123', amount: 12.34, currency: 'USD' });
  });

  it('maps Stripe cumulative refunds by payment intent', () => {
    expect(parseStripeWebhookAction({
      id: 'evt_stripe_refund_123',
      type: 'charge.refunded',
      data: { object: { id: 'ch_123', payment_intent: 'pi_123', amount_refunded: 500, currency: 'usd' } },
    })).toEqual({ action: 'REFUND', provider: 'STRIPE', eventId: 'evt_stripe_refund_123', paymentId: 'pi_123', amount: 5, currency: 'USD', mode: 'ABSOLUTE' });
  });

  it('does not mark an unpaid Stripe Checkout session as paid', () => {
    expect(parseStripeWebhookAction({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123', payment_status: 'unpaid', payment_intent: null, amount_total: 1234, currency: 'usd' } },
    })).toEqual({ action: 'IGNORE' });
    expect(parseStripeWebhookAction({
      type: 'checkout.session.expired', data: { object: { id: 'cs_test_123' } },
    })).toEqual({ action: 'CANCEL', checkoutId: 'cs_test_123' });
  });

  it('maps PayPal captures, refunds and voided orders using provider relations', () => {
    expect(parsePayPalWebhookAction({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {
      id: 'CAPTURE-123', amount: { value: '12.34', currency_code: 'USD' },
      supplementary_data: { related_ids: { order_id: 'PAYPAL-ORDER-123' } },
    } })).toEqual({ action: 'PAID', checkoutId: 'PAYPAL-ORDER-123', paymentId: 'CAPTURE-123', amount: 12.34, currency: 'USD' });
    expect(parsePayPalWebhookAction({ id: 'WH-PAYPAL-REFUND-123', event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: {
      id: 'REFUND-123', amount: { value: '2.34', currency_code: 'USD' },
      supplementary_data: { related_ids: { capture_id: 'CAPTURE-123' } },
    } })).toEqual({ action: 'REFUND', provider: 'PAYPAL', eventId: 'WH-PAYPAL-REFUND-123', paymentId: 'CAPTURE-123', amount: 2.34, currency: 'USD', mode: 'INCREMENT' });
    expect(parsePayPalWebhookAction({ event_type: 'CHECKOUT.ORDER.VOIDED', resource: { id: 'PAYPAL-ORDER-123' } }))
      .toEqual({ action: 'CANCEL', checkoutId: 'PAYPAL-ORDER-123' });
  });

  it('validates a completed PayPal Orders API capture response', () => {
    expect(parsePayPalCapturedOrder({
      id: 'PAYPAL-ORDER-123', status: 'COMPLETED',
      purchase_units: [{ payments: { captures: [{ id: 'CAPTURE-123', status: 'COMPLETED', amount: { value: '12.34', currency_code: 'USD' } }] } }],
    })).toEqual({ action: 'PAID', checkoutId: 'PAYPAL-ORDER-123', paymentId: 'CAPTURE-123', amount: 12.34, currency: 'USD' });
    expect(parsePayPalCapturedOrder({ id: 'PAYPAL-ORDER-123', status: 'APPROVED', purchase_units: [] }))
      .toEqual({ action: 'IGNORE' });
  });

  it('requires a canonical HTTPS MY3D.PR origin', () => {
    expect(canonicalSiteOrigin('https://www.my3dpr.site/')).toBe('https://www.my3dpr.site');
    expect(() => canonicalSiteOrigin(undefined)).toThrow(/required/i);
    expect(() => canonicalSiteOrigin('http://evil.example')).toThrow(/https/i);
    expect(() => canonicalSiteOrigin('https://evil.example')).toThrow(/MY3D/i);
  });

  it('builds same-site return URLs containing a signed status token', () => {
    expect(buildCheckoutUrls('https://www.my3dpr.site', 'es', 'signed.token')).toEqual({
      success: 'https://www.my3dpr.site/es/checkout/success?status_token=signed.token',
      cancel: 'https://www.my3dpr.site/es/checkout?payment=cancelled',
      paypalReturn: 'https://www.my3dpr.site/api/payments/paypal/return?lang=es&status_token=signed.token',
    });
  });
});
