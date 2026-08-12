'use client';

import { useState, useMemo, use, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { SlidersHorizontal, Search, X, Check, Grid, List } from 'lucide-react';
import { Locale, dictionaries } from '@/lib/i18n';
import { ProductCard } from '@/components/shop/ProductCard';
import { DataService } from '@/lib/supabase';
import type { Category, Product } from '@/types';

export default function ShopPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const searchParams = useSearchParams();

  const categoryQuery = searchParams.get('category');
  const filterQuery = searchParams.get('filter');
  const searchQuery = searchParams.get('q');

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryQuery || 'all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    void Promise.all([DataService.getProducts(), DataService.getCategories()]).then(([nextProducts, nextCategories]) => {
      setProducts(nextProducts);
      setCategories(nextCategories);
    });
  }, []);

  const materials = Array.from(new Set(products.map((p) => p.material)));

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name_es.toLowerCase().includes(q) ||
          p.name_en.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      const catObj = categories.find((c) => c.slug === selectedCategory);
      if (catObj) {
        list = list.filter((p) => p.category_id === catObj.id);
      }
    }

    if (selectedMaterial !== 'all') {
      list = list.filter((p) => p.material === selectedMaterial);
    }

    if (selectedStatus !== 'all') {
      list = list.filter((p) => p.status === selectedStatus);
    }

    if (filterQuery === 'new') list = list.filter((p) => p.is_new);
    if (filterQuery === 'sale') list = list.filter((p) => p.sale_price);
    if (filterQuery === 'bestsellers') list = list.filter((p) => p.is_best_seller);

    // Sorting
    if (sortBy === 'price-low') list.sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price));
    if (sortBy === 'price-high') list.sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price));
    if (sortBy === 'name') list.sort((a, b) => a.name_es.localeCompare(b.name_es));

    return list;
  }, [products, categories, selectedCategory, selectedMaterial, selectedStatus, filterQuery, searchQuery, sortBy]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-brand-dark-border mb-8">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-slate-100">
            {lang === 'es' ? 'Catálogo Completo de Productos 3D' : 'Full 3D Product Catalog'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Mostrando {filteredProducts.length} productos disponibles con envío directo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="md:hidden flex items-center gap-2 bg-brand-dark-card border border-brand-dark-border text-slate-200 text-xs px-3.5 py-2 rounded-xl font-bold"
          >
            <SlidersHorizontal className="w-4 h-4 text-brand-cyan" />
            <span>{lang === 'es' ? 'Filtros' : 'Filters'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            <label className="font-semibold">{lang === 'es' ? 'Ordenar por:' : 'Sort by:'}</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-brand-dark-card border border-brand-dark-border text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-brand-cyan"
            >
              <option value="featured">Destacados</option>
              <option value="price-low">Precio: Menor a Mayor</option>
              <option value="price-high">Precio: Mayor a Menor</option>
              <option value="name">Nombre</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden md:block space-y-6">
          {/* Category Filter */}
          <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-4 space-y-3">
            <h3 className="font-heading font-bold text-sm text-slate-200 uppercase tracking-wider">
              Categorías
            </h3>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-brand-cyan text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-brand-dark-hover'
                }`}
              >
                Todas las Categorías
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
                    selectedCategory === cat.slug
                      ? 'bg-brand-cyan text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-brand-dark-hover'
                  }`}
                >
                  {lang === 'es' ? cat.name_es : cat.name_en}
                </button>
              ))}
            </div>
          </div>

          {/* Material Filter */}
          <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-4 space-y-3">
            <h3 className="font-heading font-bold text-sm text-slate-200 uppercase tracking-wider">
              Material 3D
            </h3>
            <div className="space-y-1 text-xs">
              <button
                onClick={() => setSelectedMaterial('all')}
                className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
                  selectedMaterial === 'all'
                    ? 'bg-brand-cyan text-slate-950 font-bold'
                    : 'text-slate-300 hover:bg-brand-dark-hover'
                }`}
              >
                Todos los Materiales
              </button>
              {materials.map((mat) => (
                <button
                  key={mat}
                  onClick={() => setSelectedMaterial(mat)}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${
                    selectedMaterial === mat
                      ? 'bg-brand-cyan text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-brand-dark-hover'
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="md:col-span-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <p className="text-base font-semibold">No se encontraron productos con los filtros seleccionados.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedMaterial('all');
                  setSelectedStatus('all');
                }}
                className="text-xs bg-brand-cyan text-slate-950 px-4 py-2 rounded-xl font-bold hover:bg-white transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} lang={lang} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
