'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Box, Sparkles, Check, Trash2, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Locale, dictionaries } from '@/lib/i18n';
import { DEMO_BOX_TEMPLATES, DEMO_PRODUCTS } from '@/lib/seed-data';
import { BoxTemplate, Product } from '@/types';
import { useCart } from '@/lib/cart-store';

export default function BuildABoxPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = dictionaries[lang].box;
  const { addItem } = useCart();

  const [selectedTemplate, setSelectedTemplate] = useState<BoxTemplate>(DEMO_BOX_TEMPLATES[0]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const requiredCount = selectedTemplate.required_item_count;
  const isComplete = selectedProducts.length === requiredCount;

  const rawTotal = selectedProducts.reduce((acc, p) => acc + (p.sale_price || p.price), 0);
  const bundleDiscount = (rawTotal * selectedTemplate.bundle_discount_percent) / 100;
  const boxFinalPrice = Math.max(selectedTemplate.base_price, rawTotal - bundleDiscount);

  const handleToggleProduct = (product: Product) => {
    if (selectedProducts.some((p) => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      if (selectedProducts.length < requiredCount) {
        setSelectedProducts([...selectedProducts, product]);
      }
    }
  };

  const handleAddBoxToCart = () => {
    if (!isComplete) return;

    // Create a virtual box product
    const boxProduct: Product = {
      id: `box-${selectedTemplate.slug}-${Date.now()}`,
      name_es: `${selectedTemplate.name_es} (${selectedProducts.map((p) => p.name_es).join(', ')})`,
      name_en: `${selectedTemplate.name_en} (${selectedProducts.map((p) => p.name_en).join(', ')})`,
      slug: selectedTemplate.slug,
      sku: `BOX-${selectedTemplate.slug.toUpperCase()}`,
      description_es: 'Combo personalizado de impresión 3D Build-Your-Box',
      description_en: 'Customized Build-Your-Box 3D bundle',
      price: rawTotal,
      sale_price: boxFinalPrice,
      status: 'AVAILABLE',
      is_customizable: false,
      is_featured: true,
      is_new: false,
      is_best_seller: true,
      material: 'PLA+ Multicolored',
      weight_grams: 500,
      lead_time_days: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      images: [{ id: 'b-img', product_id: 'box', url: selectedTemplate.image_url, sort_order: 0, is_primary: true }],
    };

    addItem(boxProduct, undefined, 1, undefined, undefined, true, selectedTemplate.id);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 bg-brand-orange/20 border border-brand-orange/40 text-brand-orange text-xs font-bold px-4 py-1.5 rounded-full">
          <Box className="w-4 h-4" />
          <span>EXPERIENCIA BUILD-YOUR-BOX 3D</span>
        </div>
        <h1 className="font-heading font-black text-3xl sm:text-4xl text-slate-100">
          ARMÁ TU COMBO 3D Y AHORRA HASTA UN 25%
        </h1>
        <p className="text-xs sm:text-sm text-slate-300">
          Selecciona tu tamaño de caja favorito, elige las piezas 3D que más te gusten y recibe tu bundle listo en un empaque especial MY3D.
        </p>
      </div>

      {/* STEP 1: Select Box Template */}
      <div className="space-y-4">
        <h2 className="font-heading font-extrabold text-xl text-slate-100 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-brand-cyan text-slate-950 flex items-center justify-center font-black text-xs">1</span>
          <span>PASO 1: ELIGE EL TAMAÑO DE TU CAJA</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DEMO_BOX_TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              onClick={() => {
                setSelectedTemplate(tmpl);
                setSelectedProducts([]);
              }}
              className={`p-6 rounded-3xl border-2 cursor-pointer transition-all flex gap-6 items-center ${
                selectedTemplate.id === tmpl.id
                  ? 'bg-brand-dark-card border-brand-cyan shadow-cyan-glow'
                  : 'bg-brand-dark-surface border-brand-dark-border opacity-70 hover:opacity-100'
              }`}
            >
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-brand-dark-border">
                <Image src={tmpl.image_url} alt={tmpl.name_es} fill className="object-cover" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-brand-orange uppercase">
                  AHORRA {tmpl.bundle_discount_percent}% OFF
                </span>
                <h3 className="font-heading font-extrabold text-lg text-slate-100">{tmpl.name_es}</h3>
                <p className="text-xs text-slate-400">{tmpl.description_es}</p>
                <div className="font-extrabold text-sm text-brand-cyan pt-1">
                  Precio Base Combo: ${tmpl.base_price.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 2: Pick Products & Progress Bar */}
      <div className="space-y-6">
        <div className="sticky top-20 z-30 bg-brand-dark-surface/95 backdrop-blur-md p-4 rounded-2xl border border-brand-dark-border flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <h3 className="font-heading font-bold text-sm text-slate-100">
              Progreso de la Caja: <span className="text-brand-cyan font-black">{selectedProducts.length} de {requiredCount} seleccionados</span>
            </h3>
            <p className="text-xs text-slate-400">
              {isComplete ? '¡Caja completa y lista!' : `Faltan ${requiredCount - selectedProducts.length} piezas para completar.`}
            </p>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase">Total Bundle Estimado</span>
              <span className="font-extrabold text-lg text-brand-cyan">${boxFinalPrice.toFixed(2)}</span>
            </div>

            <button
              onClick={handleAddBoxToCart}
              disabled={!isComplete}
              className={`px-6 py-3 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all ${
                isComplete
                  ? 'bg-gradient-to-r from-brand-orange to-brand-orange-light text-slate-950 shadow-orange-glow hover:scale-105'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{dict.step4}</span>
            </button>
          </div>
        </div>

        {/* Product Picker Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {DEMO_PRODUCTS.map((prod) => {
            const isSelected = selectedProducts.some((p) => p.id === prod.id);

            return (
              <div
                key={prod.id}
                onClick={() => handleToggleProduct(prod)}
                className={`bg-brand-dark-card border-2 rounded-2xl p-4 cursor-pointer transition-all space-y-3 relative group ${
                  isSelected
                    ? 'border-brand-cyan shadow-cyan-glow bg-brand-cyan/10'
                    : 'border-brand-dark-border hover:border-slate-500'
                }`}
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-brand-dark">
                  <Image src={prod.images?.[0]?.url || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400'} alt={prod.name_es} fill className="object-cover" />
                  {isSelected && (
                    <div className="absolute inset-0 bg-brand-cyan/30 flex items-center justify-center backdrop-blur-xs">
                      <div className="w-10 h-10 rounded-full bg-brand-cyan text-slate-950 flex items-center justify-center font-bold">
                        <Check className="w-6 h-6" />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-heading font-bold text-xs text-slate-200 line-clamp-1">{prod.name_es}</h4>
                  <span className="text-xs font-bold text-brand-cyan">${(prod.sale_price || prod.price).toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
