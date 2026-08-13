'use client';

import { use, useRef, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, CreditCard, CheckCircle, Lock, ArrowRight, Truck } from 'lucide-react';
import { Locale } from '@/lib/i18n';
import { useCart } from '@/lib/cart-store';


export default function CheckoutPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const { items, subtotal, clearCart } = useCart();

  const paymentMethod = 'ATH_MOVIL' as const;

  const [loading, setLoading] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [athInstructions, setAthInstructions] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const [shippingAddress, setShippingAddress] = useState({
    full_name: '',
    street_line1: '',
    street_line2: '',
    city: 'San Juan',
    state: 'PR',
    zip_code: '00901',
    country: 'USA',
    email: '',
    phone: '',
  });

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
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
          idempotencyKey: idempotencyKey.current ??= crypto.randomUUID(),
          address: shippingAddress,
          lines: items.map((item) => ({ productId: item.product_id, variantId: item.variant_id, quantity: item.quantity, customText: item.custom_text, customNotes: item.custom_notes })),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No fue posible crear la orden.');
      setAthInstructions(result.instructions);
      setCompletedOrderNumber(result.orderNumber);
      idempotencyKey.current = null;
      clearCart();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'No fue posible crear la orden.');
    } finally {
      setLoading(false);
    }
  };

  if (completedOrderNumber) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-6">
        <div className="bg-brand-dark-card border-2 border-brand-cyan rounded-3xl p-8 space-y-4 shadow-cyan-glow animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-brand-cyan/20 border border-brand-cyan text-brand-cyan mx-auto flex items-center justify-center">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="font-heading font-black text-3xl text-slate-100">¡Gracias por tu Compra en MY3D.PR!</h1>
          <p className="text-sm text-slate-300">
            Número de Orden: <span className="font-extrabold text-brand-cyan">{completedOrderNumber}</span>
          </p>

          {athInstructions && (
            <div className="bg-brand-dark border border-brand-orange/40 rounded-2xl p-4 text-xs text-brand-orange text-left space-y-2">
              <span className="font-bold block uppercase">Instrucciones de Pago ATH Móvil:</span>
              <p className="leading-relaxed">{athInstructions}</p>
            </div>
          )}

          <p className="text-xs text-slate-400">Guarda el número de orden. Puedes vincularla y darle seguimiento verificando <span className="text-slate-200 font-semibold">{shippingAddress.email}</span> desde Mi Cuenta.</p>

          <Link
            href={`/${lang}/account`}
            className="inline-flex items-center gap-2 bg-brand-cyan text-slate-950 font-bold text-xs px-6 py-3 rounded-xl hover:bg-white transition-colors"
          >
            <span>Ver Estado de Mi Orden</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <div className="flex items-center justify-between border-b border-brand-dark-border pb-4">
        <h1 className="font-heading font-black text-2xl text-slate-100 flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand-cyan" />
          <span>Checkout Seguro MY3D.PR</span>
        </h1>
        <span className="text-xs text-slate-400">Puerto Rico & EE.UU.</span>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Shipping & Payment Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4">
            <h3 className="font-heading font-bold text-slate-200 text-base flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-cyan" />
              <span>Dirección de Envío (Puerto Rico & USA)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-300 font-semibold">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.full_name}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, full_name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-300 font-semibold">Email (para tracking) *</label>
                <input
                  type="email"
                  required
                  value={shippingAddress.email}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, email: e.target.value })}
                  placeholder="juan@gmail.com"
                  className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-slate-300 font-semibold">Dirección *</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.street_line1}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, street_line1: e.target.value })}
                  placeholder="Calle 123, Urb. Los Robles"
                  className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Pueblo / Ciudad *</label>
                <input
                  type="text"
                  required
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 rounded-xl px-3.5 py-2.5"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Estado / Código ZIP *</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={shippingAddress.state}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                    className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 rounded-xl px-3.5 py-2.5"
                  />
                  <input
                    type="text"
                    required
                    value={shippingAddress.zip_code}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, zip_code: e.target.value })}
                    className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 rounded-xl px-3.5 py-2.5"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configured payment method */}
          <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4">
            <h3 className="font-heading font-bold text-slate-200 text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-cyan" />
              <span>Método de Pago</span>
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 rounded-2xl border text-center bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold shadow-cyan-glow">
                <div className="text-xs font-bold">ATH Móvil — pago manual verificado</div>
                <div className="text-[10px] text-slate-400 mt-1">La orden permanece pendiente hasta confirmación del comercio.</div>
              </div>
            </div>

            <p className="rounded-2xl border border-brand-cyan/30 bg-brand-dark p-4 text-xs text-slate-300">Las instrucciones y el importe final se generan por el servidor después de validar precios, inventario, envío e impuestos.</p>
          </div>
        </div>

        {/* Sidebar Order Summary */}
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4 h-fit">
          <h3 className="font-heading font-bold text-slate-200 text-base border-b border-brand-dark-border pb-3">Resumen ({items.length} ítems)</h3>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Envío</span><span className="font-semibold">Calculado al confirmar</span></div>
            <div className="flex justify-between"><span>Impuestos</span><span className="font-semibold">Calculados al confirmar</span></div>
            <div className="flex justify-between text-base font-black text-slate-100 pt-3 border-t border-brand-dark-border">
              <span>Subtotal estimado</span>
              <span className="text-brand-cyan">${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || items.length === 0}
            className="w-full bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-slate-950 font-extrabold text-xs py-4 rounded-2xl shadow-cyan-glow hover:scale-102 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{loading ? 'Procesando...' : 'COMPLETAR ORDEN REAL'}</span>
          </button>
          {errorMessage && <p role="alert" className="text-xs text-red-400">{errorMessage}</p>}
        </div>
      </form>
    </div>
  );
}
