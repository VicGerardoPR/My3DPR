import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { cartLineSchema } from '@/lib/commerce';

const checkoutSchema = z.object({
  email: z.string().email().max(254),
  paymentMethod: z.literal('ATH_MOVIL'),
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

const requests = new Map<string, number[]>();
function rateLimited(key: string) {
  const now = Date.now();
  const recent = (requests.get(key) || []).filter((time) => now - time < 60_000);
  recent.push(now);
  requests.set(key, recent);
  return recent.length > 5;
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) return NextResponse.json({ error: 'Demasiados intentos. Intenta nuevamente en un minuto.', requestId }, { status: 429 });

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Los datos de checkout no son válidos.', requestId }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const athDestination = process.env.ATH_MOBILE_PHONE;
  if (!url || !serviceKey || !athDestination) {
    return NextResponse.json({ error: 'El método de pago todavía no está configurado. No se creó ninguna orden.', requestId }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('create_pending_order_atomic', {
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
  });

  if (error) {
    const safeMessage = error.message.includes('stock') ? 'No hay inventario suficiente para completar la orden.' : 'No fue posible crear la orden.';
    console.error(JSON.stringify({ requestId, area: 'checkout', code: error.code }));
    return NextResponse.json({ error: safeMessage, requestId }, { status: error.message.includes('stock') ? 409 : 500 });
  }

  const order = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    orderNumber: order.order_number,
    status: 'AWAITING_PAYMENT',
    totals: { subtotal: order.subtotal, discount: order.discount, shipping: order.shipping_cost, tax: order.tax_amount, total: order.total_amount },
    instructions: `Envía $${Number(order.total_amount).toFixed(2)} por ATH Móvil a ${athDestination} e incluye ${order.order_number} en el mensaje. La orden no se marcará pagada hasta verificación manual.`,
    requestId,
  });
}
