import { NextRequest, NextResponse } from 'next/server';
import { applyPaymentAction, claimPaymentEvent, finishPaymentEvent, paymentEventStatus } from '@/lib/payment-db';
import { assertProviderConfigured } from '@/lib/payment-providers';
import { verifyPayPalWebhook } from '@/lib/payment-server';
import { parsePayPalWebhookAction } from '@/lib/payments';
import { shouldFinalizeFailedClaim } from '@/lib/payment-workflow';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let config: ReturnType<typeof assertProviderConfigured>;
  try { config = assertProviderConfigured('PAYPAL', process.env); }
  catch { return NextResponse.json({ error: 'PayPal webhook no configurado.' }, { status: 503 }); }
  if (config.method !== 'PAYPAL') return NextResponse.json({ error: 'Configuración inválida.' }, { status: 503 });

  const event = await request.json().catch(() => null);
  const eventId = typeof event?.id === 'string' ? event.id : '';
  const eventType = typeof event?.event_type === 'string' ? event.event_type : '';
  if (!eventId || !eventType) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
  let claimed = false;
  try {
    if (!await verifyPayPalWebhook(request.headers, event, config)) {
      return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 });
    }
    claimed = await claimPaymentEvent('PAYPAL', eventId, eventType);
    if (!claimed) {
      const status = await paymentEventStatus('PAYPAL', eventId);
      return status === 'PROCESSED'
        ? NextResponse.json({ received: true, duplicate: true })
        : NextResponse.json({ error: 'Evento en proceso.' }, { status: 409 });
    }
    await applyPaymentAction(parsePayPalWebhookAction(event));
    await finishPaymentEvent('PAYPAL', eventId, true);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (shouldFinalizeFailedClaim(claimed)) {
      await finishPaymentEvent('PAYPAL', eventId, false, error instanceof Error ? error.message : 'processing failed').catch(() => undefined);
    }
    return NextResponse.json({ error: 'No fue posible aplicar el evento.' }, { status: 500 });
  }
}
