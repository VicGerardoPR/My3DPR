'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Sparkles, Tag } from 'lucide-react';
import { useCart, FREE_SHIPPING_THRESHOLD } from '@/lib/cart-store';
import { Locale } from '@/lib/i18n';

export function CartDrawer({ lang }: { lang: Locale }) {
  const {
    items,
    isOpen,
    setIsOpen,
    updateQuantity,
    removeItem,
    subtotal,
    discount,
    shippingCost,
    total,
    isFreeShipping,
    freeShippingNeeded,
    applyCoupon,
    removeCoupon,
    appliedCoupon,
  } = useCart();

  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState('');

  if (!isOpen) return null;

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode) return;
    const res = applyCoupon(couponCode);
    setCouponMessage(res.message);
    if (res.success) setCouponCode('');
  };

  const freeShippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-brand-dark-surface border-l border-brand-dark-border flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-brand-dark-border flex items-center justify-between">
            <div className="flex items-center gap-2 font-heading font-bold text-slate-200 text-lg">
              <ShoppingBag className="w-5 h-5 text-brand-cyan" />
              <span>{lang === 'es' ? 'Tu Carrito 3D' : 'Your 3D Cart'}</span>
              <span className="text-xs bg-brand-dark-card border border-brand-dark-border px-2 py-0.5 rounded-full text-brand-cyan">
                {items.length}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-brand-dark-hover"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="p-4 bg-brand-dark-card border-b border-brand-dark-border">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-300">
                {isFreeShipping
                  ? (lang === 'es' ? '🎉 ¡Envío GRATIS desbloqueado!' : '🎉 FREE Shipping Unlocked!')
                  : (lang === 'es' ? `Faltan $${freeShippingNeeded.toFixed(2)} para Envío Gratis` : `Add $${freeShippingNeeded.toFixed(2)} for Free Shipping`)}
              </span>
              <span className="text-brand-cyan">{Math.round(freeShippingProgress)}%</span>
            </div>
            <div className="w-full bg-brand-dark-border h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-cyan to-brand-orange h-full transition-all duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3 py-12">
                <div className="w-16 h-16 rounded-full bg-brand-dark-card border border-brand-dark-border flex items-center justify-center text-slate-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-sm font-medium">{lang === 'es' ? 'Tu carrito está vacío.' : 'Your cart is empty.'}</p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan px-4 py-2 rounded-xl font-bold hover:bg-brand-cyan hover:text-slate-950 transition-colors"
                >
                  {lang === 'es' ? 'Explorar Tienda' : 'Explore Shop'}
                </button>
              </div>
            ) : (
              items.map((item) => {
                const itemPrice = item.variant?.sale_price || item.variant?.price || item.product.sale_price || item.product.price;
                const primaryImg = item.product.images?.find((i) => i.is_primary)?.url || item.product.images?.[0]?.url || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400';

                return (
                  <div key={item.id} className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-3 flex gap-3 relative group">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-brand-dark border border-brand-dark-border shrink-0">
                      <Image src={primaryImg} alt={item.product.name_es} fill className="object-cover" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="text-xs font-semibold text-slate-200 truncate">
                        {lang === 'es' ? item.product.name_es : item.product.name_en}
                      </h4>

                      {item.variant && (
                        <p className="text-[11px] text-brand-cyan">
                          {item.variant.color && `Color: ${item.variant.color}`} {item.variant.size && `| Size: ${item.variant.size}`}
                        </p>
                      )}

                      {item.custom_text && (
                        <p className="text-[11px] text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded w-fit flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Text: {item.custom_text}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 border border-brand-dark-border rounded-lg bg-brand-dark px-2 py-0.5 text-xs text-slate-300">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="hover:text-white p-0.5">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="hover:text-white p-0.5">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-extrabold text-xs text-brand-cyan">
                          ${(itemPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      aria-label="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Promo Code */}
          {items.length > 0 && (
            <div className="p-4 border-t border-brand-dark-border bg-brand-dark-card/60 space-y-3">
              {/* Promo Code Form */}
              <form onSubmit={handleCouponSubmit} className="space-y-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Código de Descuento"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 uppercase"
                    />
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                  <button type="submit" className="bg-brand-dark-border text-slate-200 hover:bg-brand-cyan hover:text-slate-950 font-bold text-xs px-3 py-2 rounded-lg transition-colors">
                    {lang === 'es' ? 'Aplicar' : 'Apply'}
                  </button>
                </div>
                {couponMessage && (
                  <p className={`text-[11px] font-medium ${appliedCoupon ? 'text-green-400' : 'text-red-400'}`}>
                    {couponMessage}
                  </p>
                )}
                {appliedCoupon && (
                  <div className="flex items-center justify-between text-xs text-green-400 bg-green-950/40 border border-green-800/40 p-1.5 rounded-lg">
                    <span>Cupón {appliedCoupon.code} ({appliedCoupon.discount_value}% OFF)</span>
                    <button onClick={removeCoupon} className="text-red-400 text-[10px] underline">Eliminar</button>
                  </div>
                )}
              </form>

              {/* Price Calculation */}
              <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-brand-dark-border">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-200">${subtotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>{lang === 'es' ? 'Descuento' : 'Discount'}</span>
                    <span className="font-semibold">-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>{lang === 'es' ? 'Envío Estimado' : 'Est. Shipping'}</span>
                  <span className="font-semibold">{isFreeShipping ? <span className="text-green-400 font-bold">GRATIS</span> : `$${shippingCost.toFixed(2)}`}</span>
                </div>

                <div className="flex justify-between text-sm font-extrabold text-slate-100 pt-2 border-t border-brand-dark-border">
                  <span>Total</span>
                  <span className="text-brand-cyan">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <Link
                href={`/${lang}/checkout`}
                onClick={() => setIsOpen(false)}
                className="w-full bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-slate-950 font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-cyan-glow transition-all"
              >
                <span>{lang === 'es' ? 'PROCEDER AL CHECKOUT' : 'PROCEED TO CHECKOUT'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
