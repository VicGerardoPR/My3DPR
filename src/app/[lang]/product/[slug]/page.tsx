'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { Star, ShoppingBag, Heart, ShieldCheck, Truck, Sparkles, Clock, Check, ChevronRight } from 'lucide-react';
import { Locale, dictionaries } from '@/lib/i18n';
import { Product, ProductVariant } from '@/types';
import { DataService } from '@/lib/supabase';
import { useCart } from '@/lib/cart-store';
import { useWishlist } from '@/lib/wishlist-store';
import { ProductCard } from '@/components/shop/ProductCard';

export default function ProductDetailPage({ params }: { params: Promise<{ lang: Locale; slug: string }> }) {
  const { lang, slug } = use(params);
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>();
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [customText, setCustomText] = useState('');

  useEffect(() => {
    void DataService.getProductBySlug(slug).then((value) => {
      setProduct(value);
      setSelectedVariant(value?.variants?.[0]);
      setSelectedImage(value?.images?.[0]?.url || '');
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <div className="container mx-auto px-4 py-16 text-center text-slate-400">Cargando producto…</div>;
  if (!product) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-black text-slate-100">Producto no encontrado</h1><Link className="mt-4 inline-block text-brand-cyan" href={`/${lang}/shop`}>Volver a la tienda</Link></div>;

  const currentPrice = selectedVariant?.sale_price || selectedVariant?.price || product.sale_price || product.price;

  const relatedProducts: Product[] = [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-400">
        <Link href={`/${lang}`} className="hover:text-brand-cyan">Inicio</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <Link href={`/${lang}/shop`} className="hover:text-brand-cyan">Tienda</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-medium truncate">{product.name_es}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-brand-dark-card border border-brand-dark-border shadow-2xl">
            {selectedImage ? <Image
              src={selectedImage}
              alt={product.name_es}
              fill
              className="object-cover"
              priority
            /> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Imagen no disponible</div>}
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImage === img.url ? 'border-brand-cyan scale-105 shadow-cyan-glow' : 'border-brand-dark-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={img.url} alt="Thumbnail" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Meta & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/30 px-3 py-1 rounded-full uppercase">
                {product.material}
              </span>
              <span className="text-xs font-semibold text-slate-400">SKU: {selectedVariant?.sku || product.sku}</span>
            </div>

            <h1 className="font-heading font-black text-3xl sm:text-4xl text-slate-100 leading-tight">
              {lang === 'es' ? product.name_es : product.name_en}
            </h1>

            {product.rating != null && product.review_count != null && product.review_count > 0 && (
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{product.rating}</span>
                  <span className="text-slate-400 font-normal">({product.review_count} reseñas)</span>
                </div>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-3 p-4 bg-brand-dark-card border border-brand-dark-border rounded-2xl">
            <span className="font-heading font-extrabold text-3xl text-brand-cyan">${currentPrice.toFixed(2)}</span>
            {product.sale_price && (
              <span className="text-base text-slate-500 line-through">${product.price.toFixed(2)}</span>
            )}
            <span className="ml-auto text-xs text-green-400 font-bold bg-green-950/40 border border-green-800/40 px-2.5 py-1 rounded-lg">
              Envío a PR & EE.UU.
            </span>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed">
            {lang === 'es' ? product.description_es : product.description_en}
          </p>

          {/* Variants Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Opciones / Variantes Disponibles:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariant(v);
                      if (v.image_url) setSelectedImage(v.image_url);
                    }}
                    className={`p-3 rounded-xl border text-xs text-left font-medium transition-all ${
                      selectedVariant?.id === v.id
                        ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan font-bold shadow-cyan-glow'
                        : 'bg-brand-dark-card border-brand-dark-border text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div>{v.color || v.size}</div>
                    <div className="text-[10px] text-slate-400">Stock: {v.stock_quantity} un.</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Customization Input */}
          {product.is_customizable && (
            <div className="p-4 bg-brand-dark-card border border-brand-orange/40 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-brand-orange flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                PERSONALIZACIÓN 3D (Nombre o Texto grabado)
              </label>
              <input
                type="text"
                placeholder="Ej. NOMBRE - 2026"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full bg-brand-dark border border-brand-dark-border text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:border-brand-orange focus:outline-none"
              />
            </div>
          )}

          {/* CTA Add to Cart & Buy */}
          <div className="flex gap-4 pt-2">
            <button
              onClick={() => addItem(product, selectedVariant, quantity, customText)}
              className="flex-1 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-slate-950 font-extrabold text-sm py-4 rounded-2xl flex items-center justify-center gap-2 shadow-cyan-glow hover:scale-102 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>AGREGAR AL CARRITO</span>
            </button>

            <button
              onClick={() => toggleWishlist(product.id)}
              className={`p-4 rounded-2xl border transition-all ${
                isInWishlist(product.id)
                  ? 'bg-brand-orange text-slate-950 border-brand-orange'
                  : 'bg-brand-dark-card border-brand-dark-border text-slate-300 hover:text-brand-orange'
              }`}
            >
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Related Products */}
      <div className="pt-12 border-t border-brand-dark-border space-y-6">
        <h2 className="font-heading font-extrabold text-2xl text-slate-100">
          PRODUCTOS RELACIONADOS
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedProducts.map((rel) => (
            <ProductCard key={rel.id} product={rel} lang={lang} />
          ))}
        </div>
      </div>
    </div>
  );
}
