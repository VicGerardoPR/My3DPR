'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Package, Clock, Heart, User, CheckCircle2, Truck, FileText, ChevronRight } from 'lucide-react';
import { Locale } from '@/lib/i18n';
import { useWishlist } from '@/lib/wishlist-store';
import { DEMO_PRODUCTS } from '@/lib/seed-data';
import { ProductCard } from '@/components/shop/ProductCard';

const DEMO_ORDERS = [
  {
    id: 'ord-1',
    order_number: 'MY3D-94821',
    date: '2026-08-04',
    status: 'IN_PRODUCTION',
    total_amount: 34.98,
    items: ['Dragón de Cristal Articulado (35cm)', 'Llavero 3D Personalizado'],
    tracking_number: '9400111899560000000000',
    carrier: 'USPS Priority',
  },
  {
    id: 'ord-2',
    order_number: 'MY3D-81204',
    date: '2026-07-28',
    status: 'DELIVERED',
    total_amount: 29.99,
    items: ['Soporte Mech para Control PS5'],
    tracking_number: '9400111899561111111111',
    carrier: 'USPS Priority',
  }
];

export default function AccountPage({ params: { lang } }: { params: { lang: Locale } }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState(initialTab);

  const { wishlistIds } = useWishlist();
  const wishlistProducts = DEMO_PRODUCTS.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl">
        <div className="w-16 h-16 rounded-2xl bg-brand-cyan/20 border border-brand-cyan text-brand-cyan flex items-center justify-center font-bold text-2xl">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h1 className="font-heading font-black text-2xl text-slate-100">Mi Cuenta MY3D.PR</h1>
          <p className="text-xs text-slate-400">Cliente Registrado • San Juan, Puerto Rico</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-dark-border gap-6 text-sm font-semibold text-slate-400">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'orders' ? 'border-b-2 border-brand-cyan text-brand-cyan font-bold' : 'hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Mis Órdenes ({DEMO_ORDERS.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('wishlist')}
          className={`pb-3 transition-colors flex items-center gap-2 ${
            activeTab === 'wishlist' ? 'border-b-2 border-brand-cyan text-brand-cyan font-bold' : 'hover:text-slate-200'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Favoritos ({wishlistProducts.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {DEMO_ORDERS.map((ord) => (
            <div key={ord.id} className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-dark-border pb-4">
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-100">{ord.order_number}</h3>
                  <span className="text-xs text-slate-400">Fecha: {ord.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan px-3 py-1 rounded-full uppercase">
                    {ord.status}
                  </span>
                  <span className="font-extrabold text-slate-100 text-sm">${ord.total_amount.toFixed(2)}</span>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-slate-300 block mb-3">Línea de Tiempo del Pedido:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 bg-brand-dark rounded-xl border border-brand-cyan/40 text-brand-cyan font-bold">1. Recibido</div>
                  <div className="p-2 bg-brand-dark rounded-xl border border-brand-cyan/40 text-brand-cyan font-bold">2. En Producción 3D</div>
                  <div className="p-2 bg-brand-dark rounded-xl border border-brand-dark-border text-slate-500">3. Empacado</div>
                  <div className="p-2 bg-brand-dark rounded-xl border border-brand-dark-border text-slate-500">4. Entregado</div>
                </div>
              </div>

              <div className="text-xs text-slate-400 flex justify-between items-center pt-2">
                <span>Rastreo: {ord.carrier} ({ord.tracking_number})</span>
                <a href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${ord.tracking_number}`} target="_blank" rel="noreferrer" className="text-brand-cyan hover:underline font-bold">
                  Ver en USPS.com →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div>
          {wishlistProducts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No tienes productos guardados en favoritos.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistProducts.map((p) => (
                <ProductCard key={p.id} product={p} lang={lang} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
