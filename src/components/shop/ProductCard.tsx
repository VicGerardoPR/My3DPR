'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Eye, Star, Sparkles, Clock, CheckCircle } from 'lucide-react';
import { Product } from '@/types';
import { Locale } from '@/lib/i18n';
import { useCart } from '@/lib/cart-store';
import { useWishlist } from '@/lib/wishlist-store';
import { QuickViewModal } from './QuickViewModal';

export function ProductCard({ product, lang }: { product: Product; lang: Locale }) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const isFavorite = isInWishlist(product.id);
  const primaryImg = product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url || '/images/product-placeholder.svg';
  const secondaryImg = product.images?.[1]?.url || primaryImg;

  const currentPrice = product.sale_price || product.price;
  const isSale = !!product.sale_price && product.sale_price < product.price;

  return (
    <>
      <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl overflow-hidden group hover:border-brand-cyan/50 hover:shadow-cyan-glow/20 transition-all duration-300 flex flex-col justify-between relative">
        {/* Product Image & Badges Container */}
        <div className="relative aspect-square w-full bg-brand-dark overflow-hidden">
          <Link href={`/${lang}/product/${product.slug}`} className="block w-full h-full">
            <Image
              src={primaryImg}
              alt={lang === 'es' ? product.name_es : product.name_en}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </Link>

          {/* Badges Overlay */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
            {isSale && (
              <span className="bg-brand-orange text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow">
                OFERTA -{Math.round(((product.price - product.sale_price!) / product.price) * 100)}%
              </span>
            )}

            {product.is_best_seller && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                <Star className="w-3 h-3 fill-slate-950" />
                BEST SELLER
              </span>
            )}

            {product.status === 'READY_TO_SHIP' && (
              <span className="bg-brand-cyan text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {lang === 'es' ? 'LISTO ENVÍO' : 'READY TO SHIP'}
              </span>
            )}

            {product.status === 'MADE_TO_ORDER' && (
              <span className="bg-purple-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lang === 'es' ? 'BAJO PEDIDO' : 'MADE TO ORDER'}
              </span>
            )}
          </div>

          {/* Wishlist Heart Button */}
          <button
            onClick={() => toggleWishlist(product.id)}
            className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md border transition-all z-10 ${
              isFavorite
                ? 'bg-brand-orange text-slate-950 border-brand-orange shadow-orange-glow'
                : 'bg-slate-950/60 text-slate-300 border-white/10 hover:text-brand-orange hover:bg-slate-950'
            }`}
            aria-label="Agregar a Favoritos"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-slate-950' : ''}`} />
          </button>

          {/* Quick View Button on Hover */}
          <button
            onClick={() => setQuickViewOpen(true)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/80 hover:bg-brand-cyan hover:text-slate-950 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 shadow-lg z-10"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{lang === 'es' ? 'Vista Rápida' : 'Quick View'}</span>
          </button>
        </div>

        {/* Product Details */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="text-brand-cyan/80 font-medium">{product.material}</span>
              {product.rating && (
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>{product.rating}</span>
                </div>
              )}
            </div>

            <Link
              href={`/${lang}/product/${product.slug}`}
              className="font-heading font-bold text-sm text-slate-100 hover:text-brand-cyan transition-colors line-clamp-2"
            >
              {lang === 'es' ? product.name_es : product.name_en}
            </Link>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-brand-dark-border">
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-base text-brand-cyan">${currentPrice.toFixed(2)}</span>
              {isSale && (
                <span className="text-xs text-slate-500 line-through">${product.price.toFixed(2)}</span>
              )}
            </div>

            <button
              onClick={() => addItem(product, product.variants?.[0], 1)}
              className="bg-brand-cyan/10 border border-brand-cyan/30 hover:bg-brand-cyan hover:text-slate-950 text-brand-cyan p-2 rounded-xl transition-all shadow-sm active:scale-95"
              aria-label="Agregar al carrito"
            >
              <ShoppingBag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {quickViewOpen && (
        <QuickViewModal
          product={product}
          lang={lang}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}
