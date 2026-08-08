'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, CreditCard, CheckCircle, Lock, ArrowRight, Truck } from 'lucide-react';
import { Locale } from '@/lib/i18n';
import { useCart } from '@/lib/cart-store';
import { PaymentMethod } from '@/types';
import { PaymentAdapter } from '@/lib/payment-adapters';
import { DataService } from '@/lib/supabase';

export default function CheckoutPage({ params: { lang } }: { params: { lang: Locale } }) {
  const router = useRouter();
  const { items, subtotal, discount, shippingCost, estimatedTax, total, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ATH_MOVIL');
  const [athPhone, setAthPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedOrderNumber, setCompletedOrderNumber] = useState<string | null>(null);
  const [athInstructions, setAthInstructions] = useState<string | null>(null);

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

    try {
      // 1. Create order record
      const orderRes = await DataService.createOrder({
        guest_email: shippingAddress.email,
        subtotal,
        discount,
        shipping_cost: shippingCost,
        tax_amount: estimatedTax,
        total_amount: total,
        currency: 'USD',
        shipping_address: shippingAddress,
        shipping_method: 'USPS Priority PR/USA',
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'ATH_MOVIL' ? 'PENDING' : 'PAID',
        status: 'ORDER_RECEIVED',
        items: items.map((i) => ({
          id: i.id,
          product_name: i.product.name_es,
          variant_name: i.variant?.color || i.variant?.size,
          price: i.variant?.sale_price || i.variant?.price || i.product.sale_price || i.product.price,
          quantity: i.quantity,
          custom_text: i.custom_text,
          item_total: (i.variant?.sale_price || i.variant?.price || i.product.sale_price || i.product.price) * i.quantity,
        })),
      });

      // 2. Process payment abstraction
      const payRes = await PaymentAdapter.processPayment(paymentMethod, {
        id: 'ord-123',
        order_number: orderRes.order_number,
        subtotal,
        discount,
        shipping_cost: shippingCost,
        tax_amount: estimatedTax,
        total_amount: total,
        currency: 'USD',
        shipping_address: shippingAddress,
        shipping_method: 'USPS Priority',
        payment_status: 'PENDING',
        payment_method: paymentMethod,
        status: 'ORDER_RECEIVED',
        items: [],
        created_at: new Date().toISOString(),
      }, { athPhone });

      if (payRes.instructions) {
        setAthInstructions(payRes.instructions);
      }

      setCompletedOrderNumber(orderRes.order_number);
      clearCart();
    } catch (err) {
      console.error('Order creation error', err);
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

          <p className="text-xs text-slate-400">
            Te hemos enviado un correo de confirmación a <span className="text-slate-200 font-semibold">{shippingAddress.email}</span>. Puedes darle seguimiento desde tu panel de cuenta.
          </p>

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

          {/* Payment Method Switcher */}
          <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4">
            <h3 className="font-heading font-bold text-slate-200 text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-cyan" />
              <span>Método de Pago</span>
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'ATH_MOVIL', label: 'ATH Móvil', badge: 'PR FAVORITO' },
                { id: 'STRIPE', label: 'Tarjeta (Stripe)', badge: 'VISA / MC' },
                { id: 'PAYPAL', label: 'PayPal', badge: 'EXPRESS' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    paymentMethod === m.id
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold shadow-cyan-glow'
                      : 'bg-brand-dark border-brand-dark-border text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{m.badge}</div>
                </button>
              ))}
            </div>

            {paymentMethod === 'ATH_MOVIL' && (
              <div className="p-4 bg-brand-dark rounded-2xl border border-brand-cyan/30 text-xs space-y-2">
                <span className="font-bold text-brand-cyan block">Pago por ATH Móvil Negocios:</span>
                <p className="text-slate-300">Ingresa tu número de teléfono registrado en ATH Móvil para enviar la solicitud de transferencia:</p>
                <input
                  type="text"
                  placeholder="787-000-0000"
                  value={athPhone}
                  onChange={(e) => setAthPhone(e.target.value)}
                  className="w-full bg-brand-dark-card border border-brand-dark-border text-slate-200 rounded-xl px-3 py-2"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Order Summary */}
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4 h-fit">
          <h3 className="font-heading font-bold text-slate-200 text-base border-b border-brand-dark-border pb-3">Resumen ({items.length} ítems)</h3>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold">${subtotal.toFixed(2)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-400"><span>Descuento</span><span>-${discount.toFixed(2)}</span></div>}
            <div className="flex justify-between"><span>Envío</span><span className="font-semibold">${shippingCost.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>IVU (11.5%)</span><span className="font-semibold">${estimatedTax.toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-black text-slate-100 pt-3 border-t border-brand-dark-border">
              <span>Total Pagar</span>
              <span className="text-brand-cyan">${total.toFixed(2)}</span>
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
        </div>
      </form>
    </div>
  );
}
