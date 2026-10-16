import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cartLineSchema } from '@/lib/commerce';
import { checkoutQuoteRateLimitBucket } from '@/lib/checkout-rate-limit';
import { consumeCheckoutRateLimit, paymentDatabase } from '@/lib/payment-db';

const quoteSchema = z.object({
  lang: z.enum(['es', 'en']).default('es'),
  lines: z.array(cartLineSchema.pick({
    productId: true,
    variantId: true,
    quantity: true,
    customText: true,
    customNotes: true,
  })).min(1).max(100),
});

type QuoteRow = {
  subtotal: number | string;
  shipping_cost: number | string;
  tax_amount: number | string;
  total_amount: number | string;
  currency: string;
};

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const parsed = quoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'El carrito no es válido.', requestId }, { status: 400 });
  }

  const isEnglish = parsed.data.lang === 'en';
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'unknown';

  try {
    const allowed = await consumeCheckoutRateLimit(checkoutQuoteRateLimitBucket(ip), 30, 60);
    if (!allowed) {
      return NextResponse.json({
        error: isEnglish ? 'Too many quote requests. Please try again shortly.' : 'Demasiadas solicitudes de cotización. Intenta de nuevo en breve.',
        requestId,
      }, { status: 429 });
    }

    const { data, error } = await paymentDatabase().rpc('quote_order_totals', {
      p_lines: parsed.data.lines.map((line) => ({
        product_id: line.productId,
        variant_id: line.variantId || null,
        quantity: line.quantity,
        custom_text: line.customText || null,
        custom_notes: line.customNotes || null,
      })),
    });

    if (error) {
      console.error(JSON.stringify({ requestId, area: 'checkout-quote', code: error.code }));
      const unavailableItem = ['P0001', 'P0002', '22P02', '22023'].includes(error.code)
        || /stock|product|variant|quantity|price/i.test(error.message);
      return NextResponse.json({
        error: unavailableItem
          ? (isEnglish ? 'A cart item is unavailable or its stock changed. Refresh your cart.' : 'Un producto no está disponible o cambió el inventario. Actualiza el carrito.')
          : (isEnglish ? 'We could not calculate the order total.' : 'No fue posible calcular el total.'),
        requestId,
      }, { status: unavailableItem ? 409 : 503 });
    }

    const row = (Array.isArray(data) ? data[0] : data) as QuoteRow | null;
    if (!row) {
      return NextResponse.json({ error: isEnglish ? 'We could not calculate the order total.' : 'No fue posible calcular el total.', requestId }, { status: 503 });
    }

    const quote = {
      subtotal: Number(row.subtotal),
      shippingCost: Number(row.shipping_cost),
      tax: Number(row.tax_amount),
      total: Number(row.total_amount),
      currency: row.currency,
    };
    if (![quote.subtotal, quote.shippingCost, quote.tax, quote.total].every(Number.isFinite)) {
      return NextResponse.json({ error: isEnglish ? 'We could not calculate the order total.' : 'No fue posible calcular el total.', requestId }, { status: 503 });
    }

    return NextResponse.json({ quote, requestId });
  } catch {
    console.error(JSON.stringify({ requestId, area: 'checkout-quote', code: 'UNAVAILABLE' }));
    return NextResponse.json({
      error: isEnglish ? 'We could not calculate the order total.' : 'No fue posible calcular el total.',
      requestId,
    }, { status: 503 });
  }
}
