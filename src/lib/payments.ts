import { z } from 'zod';

export const paymentMethodSchema = z.enum(['STRIPE', 'PAYPAL']);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export function isPaymentConfirmed(status: string) {
  return ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(status);
}
export type PaymentAction =
  | { action: 'PAID'; checkoutId: string; paymentId: string; amount: number; currency: string }
  | { action: 'CANCEL'; checkoutId: string }
  | { action: 'REFUND'; provider: 'STRIPE' | 'PAYPAL'; eventId: string; paymentId: string; amount: number; currency: string; mode: 'ABSOLUTE' | 'INCREMENT' }
  | { action: 'IGNORE' };

export function toMinorUnits(amount: number) {
  if (!Number.isFinite(amount)) throw new Error('Payment amount must be finite.');
  if (amount <= 0) throw new Error('Payment amount must be positive.');
  return Math.round((amount + Number.EPSILON) * 100);
}

const stripeSessionSchema = z.object({
  id: z.string().min(1),
  payment_status: z.string().optional(),
  payment_intent: z.union([z.string(), z.object({ id: z.string() }), z.null()]).optional(),
  amount_total: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
});

export function parseStripeWebhookAction(input: unknown): PaymentAction {
  const event = z.object({ id: z.string().optional(), type: z.string(), data: z.object({ object: z.unknown() }) }).safeParse(input);
  if (!event.success) return { action: 'IGNORE' };
  if (event.data.type === 'charge.refunded') {
    const charge = z.object({
      payment_intent: z.union([z.string(), z.object({ id: z.string() })]),
      amount_refunded: z.number().int().positive(),
      currency: z.string().min(1),
    }).safeParse(event.data.data.object);
    if (!charge.success || !event.data.id) return { action: 'IGNORE' };
    const paymentId = typeof charge.data.payment_intent === 'string' ? charge.data.payment_intent : charge.data.payment_intent.id;
    return { action: 'REFUND', provider: 'STRIPE', eventId: event.data.id, paymentId, amount: charge.data.amount_refunded / 100, currency: charge.data.currency.toUpperCase(), mode: 'ABSOLUTE' };
  }
  const session = stripeSessionSchema.safeParse(event.data.data.object);
  if (!session.success) return { action: 'IGNORE' };
  if (event.data.type === 'checkout.session.expired' || event.data.type === 'checkout.session.async_payment_failed') {
    return { action: 'CANCEL', checkoutId: session.data.id };
  }
  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.data.type)) {
    return { action: 'IGNORE' };
  }
  const paymentId = typeof session.data.payment_intent === 'string'
    ? session.data.payment_intent
    : session.data.payment_intent?.id;
  if (session.data.payment_status !== 'paid' || !paymentId || session.data.amount_total === undefined || !session.data.currency) {
    return { action: 'IGNORE' };
  }
  return {
    action: 'PAID',
    checkoutId: session.data.id,
    paymentId,
    amount: session.data.amount_total / 100,
    currency: session.data.currency.toUpperCase(),
  };
}

const paypalCaptureSchema = z.object({
  id: z.string().min(1),
  amount: z.object({ value: z.string(), currency_code: z.string() }),
  supplementary_data: z.object({ related_ids: z.object({ order_id: z.string().min(1) }) }),
});

const paypalRefundSchema = z.object({
  amount: z.object({ value: z.string(), currency_code: z.string() }),
  supplementary_data: z.object({ related_ids: z.object({ capture_id: z.string().min(1) }) }),
});

export function parsePayPalWebhookAction(input: unknown): PaymentAction {
  const event = z.object({ id: z.string().optional(), event_type: z.string(), resource: z.unknown() }).safeParse(input);
  if (!event.success) return { action: 'IGNORE' };
  if (event.data.event_type === 'CHECKOUT.ORDER.VOIDED') {
    const order = z.object({ id: z.string().min(1) }).safeParse(event.data.resource);
    return order.success ? { action: 'CANCEL', checkoutId: order.data.id } : { action: 'IGNORE' };
  }
  if (event.data.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
    const refund = paypalRefundSchema.safeParse(event.data.resource);
    if (!refund.success || !event.data.id) return { action: 'IGNORE' };
    const amount = Number(refund.data.amount.value);
    if (!Number.isFinite(amount) || amount <= 0) return { action: 'IGNORE' };
    return {
      action: 'REFUND',
      provider: 'PAYPAL',
      eventId: event.data.id,
      paymentId: refund.data.supplementary_data.related_ids.capture_id,
      amount,
      currency: refund.data.amount.currency_code.toUpperCase(),
      mode: 'INCREMENT',
    };
  }
  const capture = paypalCaptureSchema.safeParse(event.data.resource);
  if (!capture.success) return { action: 'IGNORE' };
  const checkoutId = capture.data.supplementary_data.related_ids.order_id;
  if (event.data.event_type !== 'PAYMENT.CAPTURE.COMPLETED') return { action: 'IGNORE' };
  const amount = Number(capture.data.amount.value);
  if (!Number.isFinite(amount) || amount <= 0) return { action: 'IGNORE' };
  return {
    action: 'PAID',
    checkoutId,
    paymentId: capture.data.id,
    amount,
    currency: capture.data.amount.currency_code.toUpperCase(),
  };
}

const paypalCapturedOrderSchema = z.object({
  id: z.string().min(1),
  status: z.string(),
  purchase_units: z.array(z.object({
    payments: z.object({
      captures: z.array(z.object({
        id: z.string().min(1),
        status: z.string(),
        amount: z.object({ value: z.string(), currency_code: z.string() }),
      })),
    }),
  })),
});

export function parsePayPalCapturedOrder(input: unknown): PaymentAction {
  const order = paypalCapturedOrderSchema.safeParse(input);
  if (!order.success || order.data.status !== 'COMPLETED') return { action: 'IGNORE' };
  const capture = order.data.purchase_units.flatMap((unit) => unit.payments.captures)
    .find((item) => item.status === 'COMPLETED');
  if (!capture) return { action: 'IGNORE' };
  const amount = Number(capture.amount.value);
  if (!Number.isFinite(amount) || amount <= 0) return { action: 'IGNORE' };
  return {
    action: 'PAID',
    checkoutId: order.data.id,
    paymentId: capture.id,
    amount,
    currency: capture.amount.currency_code.toUpperCase(),
  };
}

export function canonicalSiteOrigin(siteUrl: string | undefined) {
  if (!siteUrl) throw new Error('NEXT_PUBLIC_SITE_URL is required for payments.');
  const site = new URL(siteUrl);
  if (site.protocol !== 'https:') throw new Error('Payment site URL must use HTTPS.');
  if (!['my3dpr.site', 'www.my3dpr.site'].includes(site.hostname)) throw new Error('Payment site URL must be a MY3D.PR domain.');
  return site.origin;
}

export function buildCheckoutUrls(siteUrl: string, lang: 'es' | 'en', statusToken: string) {
  const origin = canonicalSiteOrigin(siteUrl);
  const token = encodeURIComponent(statusToken);
  return {
    success: `${origin}/${lang}/checkout/success?status_token=${token}`,
    cancel: `${origin}/${lang}/checkout?payment=cancelled`,
    paypalReturn: `${origin}/api/payments/paypal/return?lang=${lang}&status_token=${token}`,
  };
}
