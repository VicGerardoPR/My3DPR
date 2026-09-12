'use client';

import { use, useEffect, useRef, useState } from 'react';
import { ShieldCheck, CreditCard, Lock, Truck, WalletCards } from 'lucide-react';
import { Locale } from '@/lib/i18n';
import { useCart } from '@/lib/cart-store';

export default function CheckoutPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const { items, subtotal } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'PAYPAL'>('STRIPE');
  const [available, setAvailable] = useState({ stripe: false, paypal: false, loaded: false });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    full_name: '', street_line1: '', street_line2: '', city: 'San Juan', state: 'PR',
    zip_code: '00901', country: 'USA', email: '', phone: '',
  });

  useEffect(() => {
    fetch('/api/payments/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then((config) => {
        const stripe = Boolean(config.stripe);
        const paypal = Boolean(config.paypal);
        setAvailable({ stripe, paypal, loaded: true });
        if (!stripe && paypal) setPaymentMethod('PAYPAL');
      })
      .catch(() => setAvailable({ stripe: false, paypal: false, loaded: true }));
  }, []);

  const handlePlaceOrder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: shippingAddress.email,
          paymentMethod,
          lang,
          idempotencyKey: idempotencyKey.current ??= crypto.randomUUID(),
          address: shippingAddress,
          lines: items.map((item) => ({
            productId: item.product_id, variantId: item.variant_id, quantity: item.quantity,
            customText: item.custom_text, customNotes: item.custom_notes,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.resetIdempotency) idempotencyKey.current = null;
        throw new Error(result.error || 'No fue posible iniciar el pago.');
      }
      if (!result.redirectUrl) throw new Error('El proveedor no devolvió una página de pago.');
      window.location.assign(result.redirectUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No fue posible iniciar el pago.');
      setLoading(false);
    }
  };

  const update = (field: keyof typeof shippingAddress, value: string) => setShippingAddress((current) => ({ ...current, [field]: value }));
  const inputClass = 'w-full rounded-xl border border-brand-dark-border bg-brand-dark px-3.5 py-2.5 text-slate-200';
  const selectedAvailable = paymentMethod === 'STRIPE' ? available.stripe : available.paypal;

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between border-b border-brand-dark-border pb-4">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-black text-slate-100"><Lock className="h-5 w-5 text-brand-cyan" />Checkout Seguro MY3D.PR</h1>
        <span className="text-xs text-slate-400">Puerto Rico & EE.UU.</span>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-4 rounded-3xl border border-brand-dark-border bg-brand-dark-card p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-200"><Truck className="h-5 w-5 text-brand-cyan" />Dirección de Envío</h2>
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <label className="space-y-1 sm:col-span-2"><span className="font-semibold text-slate-300">Nombre Completo *</span><input required value={shippingAddress.full_name} onChange={(e) => update('full_name', e.target.value)} className={inputClass} /></label>
              <label className="space-y-1 sm:col-span-2"><span className="font-semibold text-slate-300">Email *</span><input type="email" required value={shippingAddress.email} onChange={(e) => update('email', e.target.value)} className={inputClass} /></label>
              <label className="space-y-1 sm:col-span-2"><span className="font-semibold text-slate-300">Dirección *</span><input required value={shippingAddress.street_line1} onChange={(e) => update('street_line1', e.target.value)} className={inputClass} /></label>
              <label className="space-y-1 sm:col-span-2"><span className="font-semibold text-slate-300">Apartamento / Suite</span><input value={shippingAddress.street_line2} onChange={(e) => update('street_line2', e.target.value)} className={inputClass} /></label>
              <label className="space-y-1"><span className="font-semibold text-slate-300">Pueblo / Ciudad *</span><input required value={shippingAddress.city} onChange={(e) => update('city', e.target.value)} className={inputClass} /></label>
              <label className="space-y-1"><span className="font-semibold text-slate-300">Teléfono</span><input value={shippingAddress.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} /></label>
              <label className="space-y-1"><span className="font-semibold text-slate-300">Estado / Territorio *</span><input required maxLength={2} value={shippingAddress.state} onChange={(e) => update('state', e.target.value.toUpperCase())} className={inputClass} /></label>
              <label className="space-y-1"><span className="font-semibold text-slate-300">Código ZIP *</span><input required value={shippingAddress.zip_code} onChange={(e) => update('zip_code', e.target.value)} className={inputClass} /></label>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-brand-dark-border bg-brand-dark-card p-6">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-slate-200"><CreditCard className="h-5 w-5 text-brand-cyan" />Método de Pago</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {available.stripe && <button type="button" disabled={!available.stripe} onClick={() => setPaymentMethod('STRIPE')} className={`rounded-2xl border p-4 text-left ${paymentMethod === 'STRIPE' && available.stripe ? 'border-brand-cyan bg-brand-cyan/15' : 'border-brand-dark-border'} disabled:cursor-not-allowed disabled:opacity-40`}>
                <CreditCard className="mb-2 h-5 w-5 text-brand-cyan" /><span className="block text-xs font-bold text-slate-100">Stripe Checkout</span><span className="mt-1 block text-[10px] text-slate-400">Tarjetas, Apple Pay y Google Pay en dispositivos compatibles.</span>
              </button>}
              {available.paypal && <button type="button" disabled={!available.paypal} onClick={() => setPaymentMethod('PAYPAL')} className={`rounded-2xl border p-4 text-left ${paymentMethod === 'PAYPAL' && available.paypal ? 'border-brand-cyan bg-brand-cyan/15' : 'border-brand-dark-border'} disabled:cursor-not-allowed disabled:opacity-40`}>
                <WalletCards className="mb-2 h-5 w-5 text-brand-cyan" /><span className="block text-xs font-bold text-slate-100">PayPal Checkout</span><span className="mt-1 block text-[10px] text-slate-400">Pago mediante tu cuenta PayPal.</span>
              </button>}
            </div>
            {available.loaded && !available.stripe && !available.paypal && <p role="alert" className="rounded-2xl border border-red-800/50 bg-red-950/20 p-4 text-xs text-red-300">Los pagos todavía no están configurados. No se creará ninguna orden.</p>}
            <p className="rounded-2xl border border-brand-cyan/30 bg-brand-dark p-4 text-xs text-slate-300">El importe se calcula en el servidor. La orden solo se marca pagada después de verificar el pago con el proveedor seleccionado.</p>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-3xl border border-brand-dark-border bg-brand-dark-card p-6">
          <h2 className="border-b border-brand-dark-border pb-3 font-heading text-base font-bold text-slate-200">Resumen ({items.length} ítems)</h2>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Envío</span><span>Calculado al confirmar</span></div>
            <div className="flex justify-between"><span>Impuestos</span><span>Calculados al confirmar</span></div>
            <div className="flex justify-between border-t border-brand-dark-border pt-3 text-base font-black text-slate-100"><span>Subtotal estimado</span><span className="text-brand-cyan">${subtotal.toFixed(2)}</span></div>
          </div>
          <button type="submit" disabled={loading || items.length === 0 || !available.loaded || !selectedAvailable} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-cyan to-brand-cyan-dark py-4 text-xs font-extrabold text-slate-950 shadow-cyan-glow disabled:cursor-not-allowed disabled:opacity-40">
            <ShieldCheck className="h-4 w-4" /><span>{loading ? 'Preparando pago…' : 'CONTINUAR AL PAGO SEGURO'}</span>
          </button>
          {errorMessage && <p role="alert" className="text-xs text-red-400">{errorMessage}</p>}
        </aside>
      </form>
    </div>
  );
}
