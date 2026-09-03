import { NextRequest, NextResponse } from 'next/server';
import { applyPaymentAction, claimPaymentEvent, finishPaymentEvent, paymentEventStatus } from '@/lib/payment-db';
import { assertProviderConfigured } from '@/lib/payment-providers';
import { constructStripeEvent } from '@/lib/payment-server';
import { parseStripeWebhookAction } from '@/lib/payments';
import { shouldFinalizeFailedClaim } from '@/lib/payment-workflow';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let config: ReturnType<typeof assertProviderConfigured>;
  try { config = assertProviderConfigured('STRIPE', process.env); }
  catch { return NextResponse.json({ error: 'Stripe webhook no configurado.' }, { status: 503 }); }
  if (config.method !== 'STRIPE') return NextResponse.json({ error: 'Configuración inválida.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Firma requerida.' }, { status: 400 });

  let event;
  try {
    event = constructStripeEvent(await request.text(), signature, config);
  } catch {
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 });
  }

  let claimed = false;
  try {
    claimed = await claimPaymentEvent('STRIPE', event.id, event.type);
    if (!claimed) {
      const status = await paymentEventStatus('STRIPE', event.id);
      return status === 'PROCESSED'
        ? NextResponse.json({ received: true, duplicate: true })
        : NextResponse.json({ error: 'Evento en proceso.' }, { status: 409 });
    }
    await applyPaymentAction(parseStripeWebhookAction(event));
    await finishPaymentEvent('STRIPE', event.id, true);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (shouldFinalizeFailedClaim(claimed)) {
      await finishPaymentEvent('STRIPE', event.id, false, error instanceof Error ? error.message : 'processing failed').catch(() => undefined);
    }
    return NextResponse.json({ error: 'No fue posible aplicar el evento.' }, { status: 500 });
  }
}
