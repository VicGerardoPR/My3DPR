'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Locale } from '@/lib/i18n';
import { useCart } from '@/lib/cart-store';

type PaymentState = { loading: boolean; paid: boolean; orderNumber?: string; error?: string };

export default function CheckoutSuccessPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const search = useSearchParams();
  const { clearCart } = useCart();
  const [state, setState] = useState<PaymentState>({ loading: true, paid: false });

  useEffect(() => {
    const provider = search.get('provider');
    const checkoutId = search.get('checkout_id');
    const statusToken = search.get('status_token');
    if (!provider || !checkoutId || !statusToken) {
      setState({ loading: false, paid: false, error: 'Referencia de pago inválida.' });
      return;
    }
    fetch(`/api/payments/status?provider=${encodeURIComponent(provider)}&checkout_id=${encodeURIComponent(checkoutId)}&status_token=${encodeURIComponent(statusToken)}`, { cache: 'no-store' })
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!response.ok || !body.paid) throw new Error(body.error || 'El pago todavía no está confirmado.');
        clearCart();
        setState({ loading: false, paid: true, orderNumber: body.orderNumber });
      })
      .catch((error) => setState({ loading: false, paid: false, error: error instanceof Error ? error.message : 'No fue posible verificar el pago.' }));
  }, [clearCart, search]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="space-y-5 rounded-3xl border border-brand-dark-border bg-brand-dark-card p-8">
        {state.loading ? <Loader2 className="mx-auto h-12 w-12 animate-spin text-brand-cyan" /> : state.paid
          ? <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
          : <XCircle className="mx-auto h-12 w-12 text-red-400" />}
        <h1 className="font-heading text-3xl font-black text-slate-100">
          {state.loading ? 'Verificando tu pago…' : state.paid ? 'Pago confirmado' : 'Pago no confirmado'}
        </h1>
        {state.orderNumber && <p className="text-sm text-slate-300">Orden <strong className="text-brand-cyan">{state.orderNumber}</strong></p>}
        {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
        <p className="text-xs text-slate-400">Tu orden solo se marca pagada después de validarla directamente con el proveedor.</p>
        <div className="flex justify-center gap-3">
          <Link href={`/${lang}/account`} className="rounded-xl bg-brand-cyan px-5 py-3 text-xs font-bold text-slate-950">Ver mis órdenes</Link>
          {!state.paid && <Link href={`/${lang}/checkout`} className="rounded-xl border border-brand-dark-border px-5 py-3 text-xs font-bold text-slate-200">Volver al checkout</Link>}
        </div>
      </div>
    </div>
  );
}
