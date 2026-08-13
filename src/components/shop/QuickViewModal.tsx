'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X, Star, ShoppingBag, Heart, Sparkles, Check } from 'lucide-react';
import { Product, ProductVariant } from '@/types';
import { Locale } from '@/lib/i18n';
import { useCart } from '@/lib/cart-store';
import { useWishlist } from '@/lib/wishlist-store';

export function QuickViewModal({
  product,
  lang,
  onClose,
}: {
  product: Product;
  lang: Locale;
  onClose: () => void;
}) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants?.[0]
  );
  const [customText, setCustomText] = useState('');

  const primaryImg = product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url || '/images/product-placeholder.svg';
  const price = selectedVariant?.sale_price || selectedVariant?.price || product.sale_price || product.price;

  const handleAddToCart = () => {
    addItem(product, selectedVariant, 1, customText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-brand-dark-surface border border-brand-dark-border rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full bg-brand-dark-card border border-brand-dark-border z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square w-full bg-brand-dark">
            <Image
              src={selectedVariant?.image_url || primaryImg}
              alt={product.name_es}
              fill
              className="object-cover"
            />
          </div>

          {/* Details */}
          <div className="p-6 space-y-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider">
                {product.material}
              </span>
              <h3 className="font-heading font-extrabold text-xl text-slate-100 mt-1">
                {lang === 'es' ? product.name_es : product.name_en}
              </h3>

              <div className="flex items-center gap-2 mt-2">
                <span className="text-2xl font-extrabold text-brand-cyan">${price.toFixed(2)}</span>
                {product.sale_price && (
                  <span className="text-sm text-slate-500 line-through">${product.price.toFixed(2)}</span>
                )}
              </div>

              <p className="text-xs text-slate-300 mt-3 line-clamp-3 leading-relaxed">
                {lang === 'es' ? product.description_es : product.description_en}
              </p>

              {/* Variant Selector if available */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-4 space-y-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'es' ? 'Seleccionar Opción / Color:' : 'Select Option / Color:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariant(v)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          selectedVariant?.id === v.id
                            ? 'bg-brand-cyan text-slate-950 border-brand-cyan font-bold shadow-cyan-glow'
                            : 'bg-brand-dark-card border-brand-dark-border text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {v.color || v.size || v.sku}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customization Text Field */}
              {product.is_customizable && (
                <div className="mt-4 space-y-1.5">
                  <label className="text-xs font-semibold text-brand-orange flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {lang === 'es' ? 'Texto / Nombre a imprimir (Opcional)' : 'Custom Name/Text (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. ALEX"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 text-xs rounded-xl px-3 py-2 focus:border-brand-orange focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-brand-dark-border">
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-slate-950 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 hover:shadow-cyan-glow transition-all"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{lang === 'es' ? 'AGREGAR AL CARRITO' : 'ADD TO CART'}</span>
              </button>

              <button
                onClick={() => toggleWishlist(product.id)}
                className={`p-3 rounded-xl border transition-colors ${
                  isInWishlist(product.id)
                    ? 'bg-brand-orange text-slate-950 border-brand-orange'
                    : 'bg-brand-dark-card border-brand-dark-border text-slate-300 hover:text-brand-orange'
                }`}
              >
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
