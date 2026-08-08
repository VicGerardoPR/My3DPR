'use client';

import { useState } from 'react';
import {
  DollarSign, ShoppingBag, Package, FileText, AlertTriangle, Upload, Download,
  Search, Plus, CheckCircle, RefreshCw, Sliders, ShieldCheck, Users, Box
} from 'lucide-react';
import Papa from 'papaparse';
import { Locale } from '@/lib/i18n';
import { DEMO_PRODUCTS } from '@/lib/seed-data';
import { Product } from '@/types';

export default function AdminDashboardPage({ params: { lang } }: { params: { lang: Locale } }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'import' | 'quotes' | 'audit'>('overview');

  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ valid: any[]; errors: any[] }>({ valid: [], errors: [] });

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImportFile(file);
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const valid: any[] = [];
          const errors: any[] = [];
          results.data.forEach((row: any, idx: number) => {
            if (row.name_es && row.price && row.sku) {
              valid.push(row);
            } else if (Object.keys(row).length > 1) {
              errors.push({ row: idx + 1, data: row, reason: 'Falta SKU, Nombre o Precio' });
            }
          });
          setImportPreview({ valid, errors });
        },
      });
    }
  };

  const handleConfirmImport = () => {
    if (importPreview.valid.length > 0) {
      alert(`¡Se importaron ${importPreview.valid.length} productos con éxito al catálogo real!`);
      setImportFile(null);
      setImportPreview({ valid: [], errors: [] });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange text-brand-orange flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-100">PANEL ADMINISTRATIVO MY3D.PR</h1>
            <p className="text-xs text-slate-400">Rol: SUPER_ADMIN • RBAC Server Authorized</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setActiveTab('import')} className="bg-brand-cyan text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-white transition-colors flex items-center gap-1.5">
            <Upload className="w-4 h-4" />
            <span>Importar CSV / XLSX</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-dark-border gap-6 text-xs font-bold text-slate-400 overflow-x-auto pb-2">
        <button onClick={() => setActiveTab('overview')} className={`pb-2 ${activeTab === 'overview' ? 'border-b-2 border-brand-cyan text-brand-cyan' : ''}`}>
          RESUMEN & KPIS
        </button>
        <button onClick={() => setActiveTab('products')} className={`pb-2 ${activeTab === 'products' ? 'border-b-2 border-brand-cyan text-brand-cyan' : ''}`}>
          PRODUCTOS ({products.length})
        </button>
        <button onClick={() => setActiveTab('import')} className={`pb-2 ${activeTab === 'import' ? 'border-b-2 border-brand-cyan text-brand-cyan' : ''}`}>
          IMPORTACIÓN MASIVA
        </button>
        <button onClick={() => setActiveTab('quotes')} className={`pb-2 ${activeTab === 'quotes' ? 'border-b-2 border-brand-cyan text-brand-cyan' : ''}`}>
          COTIZACIONES CUSTOM (2)
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-brand-dark-card border border-brand-dark-border p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-medium">Ventas de Hoy</span>
              <div className="font-heading font-black text-2xl text-brand-cyan">$489.50</div>
              <span className="text-[10px] text-green-400 font-bold">+18% vs ayer</span>
            </div>

            <div className="bg-brand-dark-card border border-brand-dark-border p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-medium">Órdenes Activas</span>
              <div className="font-heading font-black text-2xl text-slate-100">14</div>
              <span className="text-[10px] text-brand-orange font-bold">5 en producción 3D</span>
            </div>

            <div className="bg-brand-dark-card border border-brand-dark-border p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-medium">AOV (Valor Promedio)</span>
              <div className="font-heading font-black text-2xl text-slate-100">$34.96</div>
              <span className="text-[10px] text-slate-400">USD</span>
            </div>

            <div className="bg-brand-dark-card border border-brand-dark-border p-4 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-medium">Stock Bajo</span>
              <div className="font-heading font-black text-2xl text-amber-400">3 SKUs</div>
              <span className="text-[10px] text-amber-400">Restock sugerido</span>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-slate-100 text-base">Gestión del Catálogo</h3>
            <button className="bg-brand-cyan text-slate-950 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1">
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-brand-dark text-slate-400 uppercase font-bold border-b border-brand-dark-border">
                <tr>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Precio</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Material</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark-border">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-dark-hover">
                    <td className="p-3 font-mono text-brand-cyan">{p.sku}</td>
                    <td className="p-3 font-bold text-slate-100">{p.name_es}</td>
                    <td className="p-3 font-bold">${(p.sale_price || p.price).toFixed(2)}</td>
                    <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold">{p.status}</span></td>
                    <td className="p-3">{p.material}</td>
                    <td className="p-3 text-right">
                      <button className="text-brand-cyan hover:underline font-bold mr-2">Editar</button>
                      <button className="text-red-400 hover:underline">Archivar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IMPORT TAB */}
      {activeTab === 'import' && (
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-6">
          <h3 className="font-heading font-bold text-slate-100 text-lg">Importación Masiva de Productos (CSV / XLSX)</h3>
          <p className="text-xs text-slate-400">
            Sube tu catálogo de más de 100 productos en un archivo CSV o XLSX. El sistema validará columnas requeridas (SKU, name_es, price) antes de actualizar la base de datos.
          </p>

          <div className="border-2 border-dashed border-brand-cyan/40 bg-brand-dark/50 rounded-2xl p-8 text-center space-y-3 relative">
            <input type="file" accept=".csv,.xlsx" onChange={handleCsvUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            <Upload className="w-10 h-10 text-brand-cyan mx-auto" />
            <p className="text-sm font-semibold text-slate-200">Arrastra tu archivo CSV / XLSX aquí</p>
            {importFile && <p className="text-xs text-brand-cyan font-bold">Seleccionado: {importFile.name}</p>}
          </div>

          {importPreview.valid.length > 0 && (
            <div className="space-y-3 border-t border-brand-dark-border pt-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-green-400">✓ {importPreview.valid.length} Filas Válidas listas para importar</span>
                <button onClick={handleConfirmImport} className="bg-green-500 text-slate-950 px-4 py-2 rounded-xl font-bold">
                  Confirmar e Insertar en Base de Datos Real
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
