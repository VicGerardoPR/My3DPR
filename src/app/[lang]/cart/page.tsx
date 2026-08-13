'use client';

import { use } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ArrowRight, Trash2, Plus, Minus, Tag, Sparkles } from 'lucide-react';
import { Locale } from '@/lib/i18n';
import { useCart, FREE_SHIPPING_THRESHOLD } from '@/lib/cart-store';

export default function CartPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const {
    items,
    updateQuantity,
    removeItem,
    subtotal,
    discount,
    shippingCost,
    estimatedTax,
    total,
    isFreeShipping,
    freeShippingNeeded,
  } = useCart();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <h1 className="font-heading font-black text-3xl text-slate-100 flex items-center gap-3">
        <ShoppingBag className="w-8 h-8 text-brand-cyan" />
        <span>Carro de Compra 3D</span>
      </h1>

      {items.length === 0 ? (
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-12 text-center space-y-4">
          <p className="text-sm font-semibold text-slate-300">Tu carrito está vacío actualmente.</p>
          <Link
            href={`/${lang}/shop`}
            className="inline-flex items-center gap-2 bg-brand-cyan text-slate-950 px-6 py-3 rounded-xl font-bold text-xs hover:bg-white transition-colors"
          >
            <span>Explorar Productos 3D</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => {
              const itemPrice = item.variant?.sale_price || item.variant?.price || item.product.sale_price || item.product.price;
              const primaryImg = item.product.images?.[0]?.url || '/images/product-placeholder.svg';

              return (
                <div key={item.id} className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-4 flex gap-4 items-center">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-brand-dark border border-brand-dark-border shrink-0">
                    <Image src={primaryImg} alt={item.product.name_es} fill className="object-cover" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-heading font-bold text-sm text-slate-100 truncate">{item.product.name_es}</h3>
                    {item.variant && <p className="text-xs text-brand-cyan">{item.variant.color || item.variant.size}</p>}
                    {item.custom_text && <p className="text-xs text-brand-orange">Personalizado: {item.custom_text}</p>}

                    <div className="flex items-center gap-3 pt-2">
                      <div className="flex items-center gap-2 border border-brand-dark-border rounded-lg bg-brand-dark px-2.5 py-1 text-xs text-slate-300">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="w-3 h-3" /></button>
                        <span className="font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="w-3 h-3" /></button>
                      </div>

                      <button onClick={() => removeItem(item.id)} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-sm text-brand-cyan">${(itemPrice * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4 h-fit">
            <h3 className="font-heading font-bold text-slate-200 text-base border-b border-brand-dark-border pb-3">Resumen de Orden</h3>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold text-slate-200">${subtotal.toFixed(2)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-400"><span>Descuento</span><span>-${discount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span>Envío (PR & USA)</span><span className="font-semibold">{isFreeShipping ? 'GRATIS' : `$${shippingCost.toFixed(2)}`}</span></div>
              <div className="flex justify-between"><span>IVU / Impuestos (11.5%)</span><span className="font-semibold">${estimatedTax.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm font-extrabold text-slate-100 pt-3 border-t border-brand-dark-border">
                <span>Total Final</span>
                <span className="text-brand-cyan">${total.toFixed(2)}</span>
              </div>
            </div>

            <Link
              href={`/${lang}/checkout`}
              className="w-full bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-slate-950 font-extrabold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-cyan-glow hover:scale-102 transition-all"
            >
              <span>PROCEDER AL CHECKOUT</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
