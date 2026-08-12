'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, ShoppingBag, Package, Upload, Users,
  TrendingUp, TrendingDown, AlertTriangle, LogOut,
  ShieldCheck, Clock, Zap, Star, BarChart3, FileText,
  Plus, RefreshCw, CheckCircle2, ArrowUpRight, ArrowDownRight,
  CreditCard, Smartphone, Loader2,
} from 'lucide-react';
import Papa from 'papaparse';
import { Locale } from '@/lib/i18n';
import { DEMO_PRODUCTS } from '@/lib/seed-data';
import { Product } from '@/types';
import type { FinancialKPIs } from '@/lib/auth';

type Tab = 'overview' | 'products' | 'import' | 'quotes';
type ImportRow = Record<string, string | undefined>;
type ImportError = { row: number; data: ImportRow; reason: string };

// ── Small helper components ──────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color = 'cyan', trend,
}: {
  label: string; value: string; sub?: string;
  color?: 'cyan' | 'orange' | 'green' | 'amber';
  trend?: { value: number; up: boolean };
}) {
  const colors = {
    cyan: 'text-brand-cyan',
    orange: 'text-brand-orange',
    green: 'text-green-400',
    amber: 'text-amber-400',
  };
  return (
    <div className="bg-brand-dark-card border border-brand-dark-border p-4 rounded-2xl space-y-1 hover:border-brand-cyan/30 transition-colors">
      <span className="text-xs text-slate-400 font-medium">{label}</span>
      <div className={`font-heading font-black text-2xl ${colors[color]}`}>{value}</div>
      <div className="flex items-center gap-1.5">
        {trend && (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${trend.up ? 'text-green-400' : 'text-red-400'}`}>
            {trend.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}%
          </span>
        )}
        {sub && <span className="text-[10px] text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}

function SalesBarChart({ data }: { data: { day: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount));
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => {
        const pct = max > 0 ? (d.amount / max) * 100 : 0;
        const isToday = i === data.length - 1;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[9px] text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              ${d.amount.toFixed(0)}
            </span>
            <div className="w-full rounded-t-lg relative overflow-hidden" style={{ height: `${Math.max(pct, 4)}%` }}>
              <div
                className={`absolute inset-0 rounded-t-lg transition-all ${isToday ? 'bg-brand-cyan' : 'bg-brand-cyan/30 group-hover:bg-brand-cyan/60'}`}
              />
            </div>
            <span className={`text-[10px] font-bold ${isToday ? 'text-brand-cyan' : 'text-slate-500'}`}>{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboardPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [products] = useState<Product[]>(DEMO_PRODUCTS);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ valid: ImportRow[]; errors: ImportError[] }>({ valid: [], errors: [] });
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    // Read admin name from cookie
    const nameCookie = document.cookie.split('; ').find((c) => c.startsWith('admin_name='));
    if (nameCookie) setAdminName(decodeURIComponent(nameCookie.split('=')[1]));

    // Fetch KPIs
    fetch('/api/admin/kpis')
      .then((r) => r.json())
      .then((data) => { setKpis(data); setLoadingKpis(false); })
      .catch(() => setLoadingKpis(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push(`/${lang}/admin/login`);
    router.refresh();
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImportFile(file);
      Papa.parse<ImportRow>(file, {
        header: true,
        complete: (results) => {
          const valid: ImportRow[] = [];
          const errors: ImportError[] = [];
          results.data.forEach((row, idx) => {
            if (row.name_es && row.price && row.sku) valid.push(row);
            else if (Object.keys(row).length > 1) errors.push({ row: idx + 1, data: row, reason: 'Falta SKU, Nombre o Precio' });
          });
          setImportPreview({ valid, errors });
        },
      });
    }
  };

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const paymentIcon = (method: string) => {
    if (method === 'ATH_MOVIL') return <Smartphone className="w-4 h-4 text-brand-cyan" />;
    if (method === 'STRIPE') return <CreditCard className="w-4 h-4 text-brand-orange" />;
    return <DollarSign className="w-4 h-4 text-green-400" />;
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'RESUMEN & KPIS' },
    { id: 'products', label: `PRODUCTOS (${products.length})` },
    { id: 'import', label: 'IMPORTACIÓN MASIVA' },
    { id: 'quotes', label: `COTIZACIONES (${kpis?.customQuotesPending ?? '…'})` },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-dark-card border border-brand-dark-border p-6 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/20 border border-brand-orange text-brand-orange flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-100">PANEL ADMINISTRATIVO MY3D.PR</h1>
            <p className="text-xs text-slate-400">
              Bienvenido, <span className="text-brand-orange font-bold">{adminName}</span>
              {' '}• SUPER_ADMIN • Acceso total
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setLoadingKpis(true); fetch('/api/admin/kpis').then(r => r.json()).then(d => { setKpis(d); setLoadingKpis(false); }); }}
            className="bg-brand-dark-hover border border-brand-dark-border text-slate-300 text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 hover:text-brand-cyan transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingKpis ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className="bg-brand-cyan text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-white transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Importar CSV</span>
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-950/60 border border-red-800/50 text-red-400 text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 hover:bg-red-900/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-dark-border gap-6 text-xs font-bold text-slate-400 overflow-x-auto pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {loadingKpis ? (
            <div className="flex items-center justify-center h-40 text-slate-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-brand-cyan" />
              <span className="text-sm">Cargando métricas financieras...</span>
            </div>
          ) : kpis ? (
            <>
              {/* Revenue KPIs */}
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> INGRESOS
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard label="Ventas de Hoy" value={fmt(kpis.salesToday)} color="cyan" trend={{ value: kpis.growthToday, up: kpis.growthToday > 0 }} sub="vs ayer" />
                  <KpiCard label="Ventas Esta Semana" value={fmt(kpis.salesWeek)} color="cyan" trend={{ value: kpis.growthWeek, up: kpis.growthWeek > 0 }} sub="vs semana pasada" />
                  <KpiCard label="Ventas Este Mes" value={fmt(kpis.salesMonth)} color="green" sub="mes actual" />
                  <KpiCard label="Valor Promedio (AOV)" value={fmt(kpis.aov)} color="orange" sub="por orden" />
                </div>
              </div>

              {/* Orders KPIs */}
              <div>
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" /> ÓRDENES
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KpiCard label="Órdenes Activas" value={String(kpis.ordersActive)} color="cyan" sub="en proceso" />
                  <KpiCard label="En Producción 3D" value={String(kpis.ordersInProduction)} color="orange" sub="imprimiéndose" />
                  <KpiCard label="Pendientes Pago" value={String(kpis.ordersPending)} color="amber" sub="por confirmar" />
                  <KpiCard label="Conversión Web" value={`${kpis.conversionRate}%`} color="green" sub="visitantes → compra" />
                </div>
              </div>

              {/* Sales Chart + Payment Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7-Day Sales Chart */}
                <div className="lg:col-span-2 bg-brand-dark-card border border-brand-dark-border rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading font-bold text-slate-100 text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-brand-cyan" />
                      Ventas Últimos 7 Días
                    </h3>
                    <span className="text-xs text-slate-400">{fmt(kpis.salesWeek)} esta semana</span>
                  </div>
                  <SalesBarChart data={kpis.dailySales} />
                </div>

                {/* Payment Methods */}
                <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-5 space-y-4">
                  <h3 className="font-heading font-bold text-slate-100 text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-orange" />
                    Métodos de Pago
                  </h3>
                  <div className="space-y-3">
                    {kpis.paymentBreakdown.map((p) => {
                      const total = kpis.paymentBreakdown.reduce((s, x) => s + x.amount, 0);
                      const pct = total > 0 ? Math.round((p.amount / total) * 100) : 0;
                      return (
                        <div key={p.method} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              {paymentIcon(p.method)}
                              <span className="font-bold text-slate-200">{p.method.replace('_', ' ')}</span>
                            </div>
                            <span className="text-slate-300 font-bold">{fmt(p.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-brand-dark rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-cyan rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-slate-500 text-right">{p.count} órdenes • {pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-5 space-y-4">
                <h3 className="font-heading font-bold text-slate-100 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Top 5 Productos por Ingresos
                </h3>
                <div className="space-y-2">
                  {kpis.topProducts.map((p, i) => {
                    const maxRev = kpis.topProducts[0].revenue;
                    const pct = maxRev > 0 ? (p.revenue / maxRev) * 100 : 0;
                    return (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-500 w-4">#{i + 1}</span>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-bold text-slate-200 truncate max-w-[60%]">{p.name}</span>
                            <span className="text-brand-cyan font-bold">{fmt(p.revenue)}</span>
                          </div>
                          <div className="h-1.5 bg-brand-dark rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-brand-cyan to-brand-cyan-dark rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 w-16 text-right">{p.units} uds.</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Quotes Pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-brand-dark-card border border-brand-orange/30 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-orange/20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-brand-orange" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Cotizaciones Custom Pendientes</p>
                    <p className="font-heading font-black text-2xl text-brand-orange">{kpis.customQuotesPending}</p>
                    <p className="text-[10px] text-slate-500">Valor pipeline: {fmt(kpis.customQuotesPipeline)}</p>
                  </div>
                </div>
                <div className="bg-brand-dark-card border border-green-800/30 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-950/50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Tasa de Conversión del Mes</p>
                    <p className="font-heading font-black text-2xl text-green-400">{kpis.conversionRate}%</p>
                    <p className="text-[10px] text-slate-500">Visitantes únicos → compra confirmada</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-500 py-12">Error cargando métricas.</div>
          )}
        </div>
      )}

      {/* ── PRODUCTS TAB ───────────────────────────────────────────────────── */}
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
                  <th className="p-3">Costo</th>
                  <th className="p-3">Margen</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Material</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark-border">
                {products.map((p) => {
                  const price = p.sale_price || p.price;
                  const cost = p.cost_price ?? price * 0.35;
                  const margin = Math.round(((price - cost) / price) * 100);
                  return (
                    <tr key={p.id} className="hover:bg-brand-dark-hover transition-colors">
                      <td className="p-3 font-mono text-brand-cyan">{p.sku}</td>
                      <td className="p-3 font-bold text-slate-100 max-w-[180px] truncate">{p.name_es}</td>
                      <td className="p-3 font-bold text-brand-cyan">${price.toFixed(2)}</td>
                      <td className="p-3 text-slate-400">${cost.toFixed(2)}</td>
                      <td className="p-3">
                        <span className={`font-bold ${margin > 50 ? 'text-green-400' : margin > 30 ? 'text-amber-400' : 'text-red-400'}`}>
                          {margin}%
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-brand-cyan/20 text-brand-cyan text-[10px] font-bold">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{p.material}</td>
                      <td className="p-3 text-right">
                        <button className="text-brand-cyan hover:underline font-bold mr-3">Editar</button>
                        <button className="text-red-400 hover:underline">Archivar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── IMPORT TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'import' && (
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-6">
          <div>
            <h3 className="font-heading font-bold text-slate-100 text-lg">Importación Masiva de Productos</h3>
            <p className="text-xs text-slate-400 mt-1">
              Sube tu catálogo en CSV o XLSX. Columnas requeridas: <code className="text-brand-cyan">sku</code>, <code className="text-brand-cyan">name_es</code>, <code className="text-brand-cyan">price</code>. Opcionales: name_en, description_es, material, status, cost_price.
            </p>
          </div>

          <div className="border-2 border-dashed border-brand-cyan/40 bg-brand-dark/50 rounded-2xl p-10 text-center space-y-3 relative hover:border-brand-cyan/70 transition-colors">
            <input type="file" accept=".csv,.xlsx" onChange={handleCsvUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            <Upload className="w-10 h-10 text-brand-cyan mx-auto" />
            <p className="text-sm font-semibold text-slate-200">Arrastra tu archivo aquí o haz clic para seleccionar</p>
            <p className="text-xs text-slate-500">CSV o XLSX — máximo 10,000 filas</p>
            {importFile && <p className="text-xs text-brand-cyan font-bold">✓ {importFile.name}</p>}
          </div>

          {(importPreview.valid.length > 0 || importPreview.errors.length > 0) && (
            <div className="space-y-3 border-t border-brand-dark-border pt-4">
              <div className="flex items-center justify-between flex-wrap gap-3 text-xs font-bold">
                <div className="flex items-center gap-4">
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {importPreview.valid.length} filas válidas
                  </span>
                  {importPreview.errors.length > 0 && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> {importPreview.errors.length} errores
                    </span>
                  )}
                </div>
                {importPreview.valid.length > 0 && (
                  <button
                    onClick={() => { alert(`¡${importPreview.valid.length} productos importados!`); setImportFile(null); setImportPreview({ valid: [], errors: [] }); }}
                    className="bg-green-500 text-slate-950 px-4 py-2 rounded-xl font-bold hover:bg-green-400 transition-colors"
                  >
                    Confirmar Importación
                  </button>
                )}
              </div>

              {importPreview.errors.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300 space-y-1">
                  {importPreview.errors.slice(0, 5).map((e) => (
                    <p key={e.row}>Fila {e.row}: {e.reason}</p>
                  ))}
                  {importPreview.errors.length > 5 && <p>...y {importPreview.errors.length - 5} más</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── QUOTES TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'quotes' && (
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-6 space-y-4">
          <h3 className="font-heading font-bold text-slate-100 text-base">Cotizaciones Custom Studio</h3>

          {/* Demo quote rows */}
          {[
            { id: 'REQ-3D-4821', name: 'Carlos Méndez', project: 'Figura personalizada Pokémon 15cm', status: 'QUOTED', budget: 85, date: '2026-08-07' },
            { id: 'REQ-3D-4790', name: 'María Colón', project: 'Portanombre escritorio corporativo', status: 'SUBMITTED', budget: 45, date: '2026-08-06' },
            { id: 'REQ-3D-4755', name: 'Jose Rodríguez', project: 'Logo empresa para montaje pared', status: 'IN_PRODUCTION', budget: 120, date: '2026-08-05' },
            { id: 'REQ-3D-4712', name: 'Andrea Torres', project: 'Maqueta arquitectónica edificio', status: 'SUBMITTED', budget: 350, date: '2026-08-04' },
          ].map((q) => (
            <div key={q.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-brand-dark border border-brand-dark-border rounded-2xl hover:border-brand-cyan/30 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-brand-cyan">{q.id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    q.status === 'IN_PRODUCTION' ? 'bg-green-950/60 text-green-400' :
                    q.status === 'QUOTED' ? 'bg-brand-cyan/20 text-brand-cyan' :
                    'bg-amber-950/60 text-amber-400'
                  }`}>{q.status}</span>
                </div>
                <p className="text-sm font-bold text-slate-200">{q.project}</p>
                <p className="text-xs text-slate-400">{q.name} · {q.date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-heading font-bold text-brand-orange">${q.budget}</span>
                <button className="bg-brand-cyan text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-white transition-colors">
                  Ver Detalles
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
