import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { cartLineSchema } from '@/lib/commerce';
import { checkoutRateLimitBuckets } from '@/lib/checkout-rate-limit';
import {
  attachPaymentProvider,
  consumeCheckoutRateLimit,
  findOrderByIdempotencyKey,
  paymentDatabase,
  releaseOrderInventory,
} from '@/lib/payment-db';
import { assertProviderConfigured, shouldReleaseReservationAfterProviderFailure } from '@/lib/payment-providers';
import { canRecoverIdempotentOrder } from '@/lib/payment-workflow';
import {
  createPayPalCheckout,
  createStripeCheckout,
  expireStripeCheckout,
  retrievePayPalRedirect,
  retrieveStripeCheckout,
} from '@/lib/payment-server';
import { buildCheckoutUrls, canonicalSiteOrigin, paymentMethodSchema } from '@/lib/payments';
import { createPaymentStatusToken } from '@/lib/payment-status-token';

const checkoutSchema = z.object({
  email: z.string().email().max(254),
  paymentMethod: paymentMethodSchema,
  lang: z.enum(['es', 'en']).default('es'),
  idempotencyKey: z.string().uuid(),
  address: z.object({
    full_name: z.string().trim().min(2).max(120),
    street_line1: z.string().trim().min(3).max(160),
    street_line2: z.string().trim().max(160).optional(),
    city: z.string().trim().min(2).max(100),
    state: z.string().trim().regex(/^[A-Za-z]{2}$/),
    zip_code: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
    country: z.literal('USA'),
    phone: z.string().trim().max(30).optional(),
  }),
  lines: z.array(cartLineSchema.pick({ productId: true, variantId: true, quantity: true, customText: true, customNotes: true })).min(1).max(100),
});

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Los datos de checkout no son válidos.', requestId }, { status: 400 });

  let providerConfig: ReturnType<typeof assertProviderConfigured>;
  let siteOrigin: string;
  const statusSecret = process.env.PAYMENT_STATUS_SECRET || '';
  try {
    providerConfig = assertProviderConfigured(parsed.data.paymentMethod, process.env);
    siteOrigin = canonicalSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
    if (statusSecret.length < 32) throw new Error('Payment status secret is missing.');
  } catch {
    return NextResponse.json({ error: 'El método de pago seleccionado todavía no está configurado.', requestId }, { status: 503 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'El checkout no está configurado.', requestId }, { status: 503 });
  }

  const authClient = createServerClient(url, anonKey, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: () => undefined },
  });
  const { data: userData } = await authClient.auth.getUser();
  const verifiedUser = userData.user?.email?.toLowerCase() === parsed.data.email.toLowerCase() ? userData.user : null;
  const db = paymentDatabase();
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';
  try {
    const buckets = checkoutRateLimitBuckets(ip, parsed.data.email);
    const allowed = await Promise.all([
      consumeCheckoutRateLimit(buckets[0], 5, 60),
      consumeCheckoutRateLimit(buckets[1], 3, 60),
      consumeCheckoutRateLimit(buckets[2], 30, 86_400),
      consumeCheckoutRateLimit(buckets[3], 10, 86_400),
    ]);
    if (allowed.some((value) => !value)) {
      return NextResponse.json({ error: 'Demasiados intentos. Intenta nuevamente en un minuto.', requestId }, { status: 429 });
    }
  } catch {
    return NextResponse.json({ error: 'No fue posible validar el checkout.', requestId }, { status: 503 });
  }
  const { data, error } = await db.rpc('create_pending_order_atomic', {
    p_email: parsed.data.email.toLowerCase(),
    p_address: parsed.data.address,
    p_lines: parsed.data.lines.map((line) => ({
      product_id: line.productId,
      variant_id: line.variantId || null,
      quantity: line.quantity,
      custom_text: line.customText || null,
      custom_notes: line.customNotes || null,
    })),
    p_payment_method: parsed.data.paymentMethod,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_user_id: verifiedUser?.id || null,
  });

  let orderData: unknown = error ? null : data;
  if (error?.code === '23505') {
    const existing = await findOrderByIdempotencyKey(parsed.data.idempotencyKey);
    if (canRecoverIdempotentOrder(error.code, existing, parsed.data.email, parsed.data.paymentMethod)) {
      orderData = existing;
    }
  }
  if (error && !orderData) {
    const safeMessage = error.message.includes('stock') ? 'No hay inventario suficiente para completar la orden.' : 'No fue posible crear la orden.';
    console.error(JSON.stringify({ requestId, area: 'checkout-order', code: error.code }));
    return NextResponse.json({ error: safeMessage, requestId, resetIdempotency: true }, { status: error.message.includes('stock') ? 409 : 500 });
  }

  const order = (Array.isArray(orderData) ? orderData[0] : orderData) as {
    id: string; order_number: string; guest_email: string; total_amount: number | string; currency: string;
    status: string; payment_status: string; provider_checkout_id?: string | null;
  };
  if (order.status !== 'AWAITING_PAYMENT' || order.payment_status !== 'PENDING') {
    return NextResponse.json({ error: 'Esta orden ya no está disponible para pago.', requestId, resetIdempotency: true }, { status: 409 });
  }

  const statusToken = createPaymentStatusToken(order.id, statusSecret, Date.now(), 4 * 60 * 60);
  const urls = buildCheckoutUrls(siteOrigin, parsed.data.lang, statusToken);
  const providerOrder = {
    id: order.id,
    orderNumber: order.order_number,
    email: order.guest_email,
    total: Number(order.total_amount),
    currency: order.currency,
  };
  let checkoutId = order.provider_checkout_id || null;

  try {
    let redirectUrl: string;
    if (checkoutId && parsed.data.paymentMethod === 'STRIPE' && providerConfig.method === 'STRIPE') {
      const session = await retrieveStripeCheckout(checkoutId, providerConfig);
      if (!session.url || session.status !== 'open') throw new Error('Stripe Checkout is not open.');
      redirectUrl = session.url;
    } else if (checkoutId && parsed.data.paymentMethod === 'PAYPAL' && providerConfig.method === 'PAYPAL') {
      redirectUrl = await retrievePayPalRedirect(checkoutId, providerConfig);
    } else if (parsed.data.paymentMethod === 'STRIPE' && providerConfig.method === 'STRIPE') {
      const checkout = await createStripeCheckout(providerOrder, urls, providerConfig);
      checkoutId = checkout.checkoutId;
      redirectUrl = checkout.redirectUrl;
      await attachPaymentProvider(order.id, 'STRIPE', checkoutId);
    } else if (parsed.data.paymentMethod === 'PAYPAL' && providerConfig.method === 'PAYPAL') {
      const checkout = await createPayPalCheckout(providerOrder, urls, providerConfig);
      checkoutId = checkout.checkoutId;
      redirectUrl = checkout.redirectUrl;
      await attachPaymentProvider(order.id, 'PAYPAL', checkoutId);
    } else {
      throw new Error('Payment provider mismatch.');
    }

    return NextResponse.json({ orderNumber: order.order_number, redirectUrl, requestId });
  } catch {
    let providerSafelyClosed = false;
    if (checkoutId && parsed.data.paymentMethod === 'STRIPE' && providerConfig.method === 'STRIPE') {
      providerSafelyClosed = await expireStripeCheckout(checkoutId, providerConfig);
    }
    const resetIdempotency = shouldReleaseReservationAfterProviderFailure(checkoutId, parsed.data.paymentMethod, providerSafelyClosed);
    if (resetIdempotency) {
      await releaseOrderInventory(order.id).catch(() => undefined);
    }
    console.error(JSON.stringify({ requestId, area: 'checkout-provider', provider: parsed.data.paymentMethod }));
    return NextResponse.json({ error: 'No fue posible iniciar el pago. No se realizó ningún cargo.', requestId, resetIdempotency }, { status: 502 });
  }
}
