'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Archive, BarChart3, Boxes, CheckCircle2, ClipboardList, DollarSign, Edit3,
  Loader2, LogOut, PackagePlus, RefreshCw, RotateCcw, Save, ShieldCheck,
  ShoppingBag, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import type { FinancialKPIs } from '@/lib/auth';
import type { AdminPermission, AdminRole } from '@/lib/admin-permissions';
import type { CustomRequestStatus, Product, ProductStatus } from '@/types';

type AdminIdentity = { id: string; email: string; fullName: string; role: AdminRole; permissions: AdminPermission[] };
type AdminProduct = Product & { archived_at?: string | null; archived_by?: string | null };
type AdminQuote = {
  id: string; request_number: string; customer_name: string; customer_email: string; customer_phone?: string;
  project_name: string; description: string; desired_size?: string; quantity: number; colors?: string;
  material?: string; deadline?: string; budget?: number | null; status: CustomRequestStatus; files?: unknown[];
  admin_notes?: string | null; updated_by?: string | null; created_at: string; updated_at?: string;
};
type AdminUser = {
  id: string; email: string; full_name: string; role: AdminRole; active: boolean; invited?: boolean;
  email_confirmed?: boolean; last_sign_in_at?: string | null; created_at: string;
};
type Tab = 'overview' | 'products' | 'quotes' | 'team';

const inputClass = 'w-full rounded-xl border border-brand-dark-border bg-brand-dark px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-brand-cyan';
const labelClass = 'space-y-1 text-xs font-bold text-slate-300';
const productStatuses: ProductStatus[] = ['AVAILABLE', 'READY_TO_SHIP', 'MADE_TO_ORDER', 'LOW_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'COMING_SOON'];
const quoteStatuses: CustomRequestStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'QUOTED', 'APPROVED', 'REJECTED', 'PAID', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
const adminRoles: AdminRole[] = ['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'QUOTE_MANAGER'];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'No fue posible completar la operación.');
  return body as T;
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon: typeof DollarSign }) {
  return <div className="rounded-2xl border border-brand-dark-border bg-brand-dark-card p-4">
    <div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Icon className="h-4 w-4 text-brand-cyan" />{label}</div>
    <div className="font-heading text-2xl font-black text-slate-100">{value}</div>
  </div>;
}

function ProductCreateForm({ onClose, onCreated }: { onClose: () => void; onCreated: (product: AdminProduct) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const result = await api<{ product: AdminProduct }>('/api/admin/products', { method: 'POST', body: new FormData(event.currentTarget) });
      onCreated(result.product);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible crear el producto.'); }
    finally { setSaving(false); }
  };
  return <div className="rounded-2xl border border-brand-cyan/30 bg-brand-dark-card p-5">
    <div className="mb-4 flex items-center justify-between"><h3 className="font-heading font-bold text-slate-100">Nuevo producto</h3><button onClick={onClose} aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className={labelClass}>Nombre en español<input name="name_es" required minLength={2} className={inputClass} /></label>
      <label className={labelClass}>Nombre en inglés<input name="name_en" required minLength={2} className={inputClass} /></label>
      <label className={labelClass}>Slug<input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="nombre-del-producto" className={inputClass} /></label>
      <label className={labelClass}>SKU<input name="sku" required minLength={3} placeholder="MY3D-001" className={inputClass} /></label>
      <label className={labelClass}>Precio<input name="price" required type="number" min="0.01" step="0.01" className={inputClass} /></label>
      <label className={labelClass}>Costo<input name="cost_price" type="number" min="0" step="0.01" className={inputClass} /></label>
      <label className={labelClass}>Inventario<input name="stock" required type="number" min="0" step="1" className={inputClass} /></label>
      <label className={labelClass}>Material<input name="material" required defaultValue="PLA" className={inputClass} /></label>
      <label className={labelClass}>Color<input name="color" required defaultValue="Estándar" className={inputClass} /></label>
      <label className={labelClass}>Tamaño<input name="size" required defaultValue="Estándar" className={inputClass} /></label>
      <label className={labelClass}>Estado<select name="status" defaultValue="AVAILABLE" className={inputClass}>{productStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label className={labelClass}>Imagen principal<input name="image" required type="file" accept="image/png,image/jpeg,image/webp" className={inputClass} /></label>
      <label className={`${labelClass} md:col-span-2`}>Descripción en español<textarea name="description_es" rows={3} className={inputClass} /></label>
      <label className={`${labelClass} md:col-span-2`}>Descripción en inglés<textarea name="description_en" rows={3} className={inputClass} /></label>
      {error && <p className="md:col-span-2 rounded-xl border border-red-800 bg-red-950/40 p-3 text-xs text-red-300">{error}</p>}
      <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-brand-dark-border px-4 py-2 text-xs">Cancelar</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand-cyan px-4 py-2 text-xs font-bold text-slate-950">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Crear producto</button></div>
    </form>
  </div>;
}

function ProductEditForm({ product, onClose, onSaved }: { product: AdminProduct; onClose: () => void; onSaved: (product: AdminProduct) => void }) {
  const variant = product.variants?.[0];
  const [draft, setDraft] = useState({ name_es: product.name_es, name_en: product.name_en, description_es: product.description_es || '', description_en: product.description_en || '', price: Number(product.price), cost_price: product.cost_price == null ? null : Number(product.cost_price), stock: variant?.stock_quantity ?? 0, material: product.material, color: variant?.color || 'Estándar', size: variant?.size || 'Estándar', status: product.status, is_featured: product.is_featured });
  const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { const result = await api<{ product: AdminProduct }>(`/api/admin/products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) }); onSaved(result.product); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible editar.'); } finally { setSaving(false); } };
  return <div className="rounded-2xl border border-brand-orange/30 bg-brand-dark-card p-5"><div className="mb-4 flex justify-between"><h3 className="font-heading font-bold">Editar {product.name_es}</h3><button onClick={onClose}><X className="h-5 w-5" /></button></div>
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <label className={labelClass}>Nombre ES<input value={draft.name_es} onChange={(e) => setDraft({ ...draft, name_es: e.target.value })} className={inputClass} /></label><label className={labelClass}>Nombre EN<input value={draft.name_en} onChange={(e) => setDraft({ ...draft, name_en: e.target.value })} className={inputClass} /></label>
      <label className={labelClass}>Precio<input type="number" min="0.01" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className={inputClass} /></label><label className={labelClass}>Costo<input type="number" min="0" step="0.01" value={draft.cost_price ?? ''} onChange={(e) => setDraft({ ...draft, cost_price: e.target.value === '' ? null : Number(e.target.value) })} className={inputClass} /></label>
      <label className={labelClass}>Inventario<input type="number" min="0" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} className={inputClass} /></label><label className={labelClass}>Estado<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as ProductStatus })} className={inputClass}>{productStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
      <label className={labelClass}>Material<input value={draft.material} onChange={(e) => setDraft({ ...draft, material: e.target.value })} className={inputClass} /></label><label className={labelClass}>Color<input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className={inputClass} /></label>
      <label className={`${labelClass} md:col-span-2`}>Descripción ES<textarea rows={3} value={draft.description_es} onChange={(e) => setDraft({ ...draft, description_es: e.target.value })} className={inputClass} /></label><label className={`${labelClass} md:col-span-2`}>Descripción EN<textarea rows={3} value={draft.description_en} onChange={(e) => setDraft({ ...draft, description_en: e.target.value })} className={inputClass} /></label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.is_featured} onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })} />Producto destacado</label>
      {error && <p className="md:col-span-2 text-xs text-red-400">{error}</p>}<div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-xs">Cancelar</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand-orange px-4 py-2 text-xs font-bold text-slate-950"><Save className="h-4 w-4" />Guardar</button></div>
    </form></div>;
}

export function AdminDashboard({ lang }: { lang: string }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null); const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [kpis, setKpis] = useState<FinancialKPIs | null>(null); const [products, setProducts] = useState<AdminProduct[]>([]); const [quotes, setQuotes] = useState<AdminQuote[]>([]); const [team, setTeam] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true); const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [showCreate, setShowCreate] = useState(false); const [editing, setEditing] = useState<AdminProduct | null>(null); const [selectedQuote, setSelectedQuote] = useState<AdminQuote | null>(null);
  const can = useCallback((permission: AdminPermission) => admin?.permissions.includes(permission) ?? false, [admin]);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const me = await api<{ admin: AdminIdentity }>('/api/admin/me'); setAdmin(me.admin);
      const tasks: Promise<void>[] = [api<FinancialKPIs>('/api/admin/kpis').then(setKpis)];
      if (me.admin.permissions.includes('manage_products')) tasks.push(api<{ products: AdminProduct[] }>('/api/admin/products').then((r) => setProducts(r.products)));
      if (me.admin.permissions.includes('manage_quotes')) tasks.push(api<{ quotes: AdminQuote[] }>('/api/admin/quotes').then((r) => setQuotes(r.quotes)));
      if (me.admin.permissions.includes('manage_admins')) tasks.push(api<{ admins: AdminUser[] }>('/api/admin/users').then((r) => setTeam(r.admins)));
      await Promise.all(tasks);
    } catch (reason) { const message = reason instanceof Error ? reason.message : 'No fue posible cargar el panel.'; setError(message); if (/sesión|revocado/i.test(message)) router.push(`/${lang}/admin/login`); }
    finally { setLoading(false); }
  }, [lang, router]);
  useEffect(() => { void load(); }, [load]);

  const replaceProduct = (product: AdminProduct) => setProducts((current) => current.map((item) => item.id === product.id ? product : item));
  const archiveProduct = async (product: AdminProduct) => { if (!confirm(`¿Quitar “${product.name_es}” del catálogo público?`)) return; try { const result = await api<{ product: AdminProduct }>(`/api/admin/products/${product.id}`, { method: 'DELETE' }); replaceProduct(result.product); setNotice('Producto archivado y retirado del catálogo.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible archivar.'); } };
  const restoreProduct = async (product: AdminProduct) => { try { const result = await api<{ product: AdminProduct }>(`/api/admin/products/${product.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }) }); replaceProduct(result.product); setNotice('Producto restaurado.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible restaurar.'); } };
  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' }); router.push(`/${lang}/admin/login`); router.refresh(); };
  const availableCount = useMemo(() => products.filter((product) => !product.archived_at).length, [products]);

  if (loading && !admin) return <div className="flex min-h-[50vh] items-center justify-center gap-3"><Loader2 className="h-7 w-7 animate-spin text-brand-cyan" />Cargando panel seguro…</div>;
  return <div className="container mx-auto space-y-6 px-4 py-8">
    <header className="flex flex-col justify-between gap-4 rounded-3xl border border-brand-dark-border bg-brand-dark-card p-5 md:flex-row md:items-center"><div className="flex items-center gap-3"><div className="rounded-2xl border border-brand-orange/50 bg-brand-orange/10 p-3"><ShieldCheck className="h-6 w-6 text-brand-orange" /></div><div><h1 className="font-heading text-2xl font-black">PANEL ADMINISTRATIVO</h1><p className="text-xs text-slate-400">{admin?.fullName} · <span className="font-bold text-brand-orange">{admin?.role}</span></p></div></div><div className="flex gap-2"><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-brand-dark-border px-3 py-2 text-xs"><RefreshCw className="h-4 w-4" />Actualizar</button><button onClick={logout} className="flex items-center gap-2 rounded-xl border border-red-800 px-3 py-2 text-xs text-red-400"><LogOut className="h-4 w-4" />Salir</button></div></header>
    {(error || notice) && <div className={`flex items-center justify-between rounded-xl border p-3 text-xs ${error ? 'border-red-800 bg-red-950/30 text-red-300' : 'border-green-800 bg-green-950/30 text-green-300'}`}><span>{error || notice}</span><button onClick={() => { setError(''); setNotice(''); }}><X className="h-4 w-4" /></button></div>}
    <nav className="flex gap-2 overflow-x-auto border-b border-brand-dark-border pb-2">{([['overview','Resumen'], ...(can('manage_products') ? [['products','Productos']] : []), ...(can('manage_quotes') ? [['quotes','Cotizaciones']] : []), ...(can('manage_admins') ? [['team','Administradores']] : [])] as [Tab,string][]).map(([id,label]) => <button key={id} onClick={() => setActiveTab(id)} className={`rounded-xl px-4 py-2 text-xs font-bold ${activeTab === id ? 'bg-brand-cyan text-slate-950' : 'text-slate-400 hover:bg-brand-dark-card'}`}>{label}</button>)}</nav>

    {activeTab === 'overview' && <section className="space-y-5"><div className="grid grid-cols-2 gap-4 lg:grid-cols-4"><Kpi label="Ventas del mes" value={`$${Number(kpis?.salesMonth || 0).toFixed(2)}`} icon={DollarSign} /><Kpi label="Órdenes activas" value={String(kpis?.ordersActive || 0)} icon={ShoppingBag} /><Kpi label="Productos disponibles" value={String(availableCount)} icon={Boxes} /><Kpi label="Cotizaciones pendientes" value={String(kpis?.customQuotesPending || 0)} icon={ClipboardList} /></div><div className="rounded-2xl border border-brand-dark-border bg-brand-dark-card p-5"><h2 className="mb-4 flex items-center gap-2 font-heading font-bold"><BarChart3 className="h-5 w-5 text-brand-cyan" />Estado operativo</h2><div className="grid gap-3 text-sm md:grid-cols-3"><p>Inventario administrable: <b>{products.reduce((sum, product) => sum + (product.variants?.reduce((n, variant) => n + variant.stock_quantity, 0) || 0), 0)} unidades</b></p><p>Cotizaciones registradas: <b>{quotes.length}</b></p><p>Administradores activos: <b>{team.filter((person) => person.active).length || (admin ? 1 : 0)}</b></p></div></div></section>}

    {activeTab === 'products' && can('manage_products') && <section className="space-y-4">{showCreate && <ProductCreateForm onClose={() => setShowCreate(false)} onCreated={(product) => { setProducts((current) => [product, ...current]); setShowCreate(false); setNotice('Producto creado y publicado.'); }} />}{editing && <ProductEditForm product={editing} onClose={() => setEditing(null)} onSaved={(product) => { replaceProduct(product); setEditing(null); setNotice('Producto actualizado.'); }} />}<div className="rounded-3xl border border-brand-dark-border bg-brand-dark-card p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-lg font-bold">Catálogo actual</h2><p className="text-xs text-slate-400">{availableCount} publicados · {products.length - availableCount} archivados</p></div><button onClick={() => { setShowCreate(true); setEditing(null); }} className="flex items-center gap-2 rounded-xl bg-brand-cyan px-4 py-2 text-xs font-bold text-slate-950"><PackagePlus className="h-4 w-4" />Añadir producto</button></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-xs"><thead className="border-b border-brand-dark-border text-slate-400"><tr><th className="p-3">Producto</th><th>SKU</th><th>Precio</th><th>Stock</th><th>Estado</th><th>Visibilidad</th><th className="text-right">Acciones</th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-b border-brand-dark-border/60"><td className="p-3 font-bold">{product.name_es}</td><td className="font-mono text-brand-cyan">{product.sku}</td><td>${Number(product.price).toFixed(2)}</td><td>{product.variants?.reduce((sum, variant) => sum + variant.stock_quantity, 0) || 0}</td><td>{product.status}</td><td>{product.archived_at ? <span className="text-red-400">Archivado</span> : <span className="text-green-400">Publicado</span>}</td><td><div className="flex justify-end gap-2"><button onClick={() => { setEditing(product); setShowCreate(false); }} className="rounded-lg p-2 text-brand-cyan" title="Editar"><Edit3 className="h-4 w-4" /></button>{product.archived_at ? <button onClick={() => void restoreProduct(product)} className="rounded-lg p-2 text-green-400" title="Restaurar"><RotateCcw className="h-4 w-4" /></button> : <button onClick={() => void archiveProduct(product)} className="rounded-lg p-2 text-red-400" title="Quitar"><Archive className="h-4 w-4" /></button>}</div></td></tr>)}</tbody></table></div></div></section>}

    {activeTab === 'quotes' && can('manage_quotes') && <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]"><div className="space-y-3">{quotes.length === 0 ? <div className="rounded-2xl border p-8 text-center text-sm text-slate-400">No hay cotizaciones.</div> : quotes.map((quote) => <button key={quote.id} onClick={() => setSelectedQuote({ ...quote })} className={`w-full rounded-2xl border p-4 text-left ${selectedQuote?.id === quote.id ? 'border-brand-cyan bg-brand-cyan/5' : 'border-brand-dark-border bg-brand-dark-card'}`}><div className="flex justify-between"><b>{quote.request_number}</b><span className="text-brand-orange">{quote.status}</span></div><p className="mt-1 text-sm">{quote.project_name}</p><p className="text-xs text-slate-400">{quote.customer_name} · {quote.quantity} unidad(es)</p></button>)}</div>{selectedQuote ? <QuoteEditor quote={selectedQuote} onSaved={(quote) => { setQuotes((current) => current.map((item) => item.id === quote.id ? quote : item)); setSelectedQuote(quote); setNotice('Cotización actualizada.'); }} /> : <div className="rounded-2xl border border-brand-dark-border bg-brand-dark-card p-8 text-center text-sm text-slate-400">Selecciona una cotización para ver sus detalles.</div>}</section>}

    {activeTab === 'team' && can('manage_admins') && <TeamManager currentAdmin={admin!} team={team} setTeam={setTeam} setNotice={setNotice} setError={setError} />}
  </div>;
}

function QuoteEditor({ quote, onSaved }: { quote: AdminQuote; onSaved: (quote: AdminQuote) => void }) {
  const [status, setStatus] = useState(quote.status); const [budget, setBudget] = useState(quote.budget == null ? '' : String(quote.budget)); const [notes, setNotes] = useState(quote.admin_notes || ''); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  useEffect(() => { setStatus(quote.status); setBudget(quote.budget == null ? '' : String(quote.budget)); setNotes(quote.admin_notes || ''); }, [quote]);
  const save = async () => { setSaving(true); setError(''); try { const result = await api<{ quote: AdminQuote }>(`/api/admin/quotes/${quote.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, budget: budget === '' ? null : Number(budget), admin_notes: notes || null }) }); onSaved(result.quote); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible guardar.'); } finally { setSaving(false); } };
  return <div className="space-y-4 rounded-2xl border border-brand-dark-border bg-brand-dark-card p-5"><div><h2 className="font-heading text-lg font-bold">{quote.project_name}</h2><p className="text-xs text-slate-400">{quote.request_number} · {new Date(quote.created_at).toLocaleString('es-PR')}</p></div><div className="grid gap-3 text-sm md:grid-cols-2"><p><b>Cliente:</b> {quote.customer_name}</p><p><b>Email:</b> {quote.customer_email}</p><p><b>Teléfono:</b> {quote.customer_phone || '—'}</p><p><b>Cantidad:</b> {quote.quantity}</p><p><b>Material:</b> {quote.material || '—'}</p><p><b>Tamaño:</b> {quote.desired_size || '—'}</p></div><div className="rounded-xl bg-brand-dark p-4 text-sm whitespace-pre-wrap">{quote.description}</div><label className={labelClass}>Estado<select value={status} onChange={(e) => setStatus(e.target.value as CustomRequestStatus)} className={inputClass}>{quoteStatuses.map((value) => <option key={value}>{value}</option>)}</select></label><label className={labelClass}>Presupuesto / cotización estimada<input type="number" min="0" step="0.01" value={budget} onChange={(e) => setBudget(e.target.value)} className={inputClass} /></label><label className={labelClass}>Notas internas<textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} /></label>{error && <p className="text-xs text-red-400">{error}</p>}<button onClick={() => void save()} disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand-cyan px-4 py-2 text-xs font-bold text-slate-950"><Save className="h-4 w-4" />Guardar cotización</button></div>;
}

function TeamManager({ currentAdmin, team, setTeam, setNotice, setError }: { currentAdmin: AdminIdentity; team: AdminUser[]; setTeam: React.Dispatch<React.SetStateAction<AdminUser[]>>; setNotice: (value: string) => void; setError: (value: string) => void }) {
  const [adding, setAdding] = useState(false); const [saving, setSaving] = useState(false);
  const add = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(''); const data = new FormData(event.currentTarget); try { const result = await api<{ admin: AdminUser; invited: boolean }>('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), full_name: data.get('full_name'), role: data.get('role') }) }); setTeam((current) => [...current.filter((person) => person.id !== result.admin.id), result.admin]); setAdding(false); setNotice(result.invited ? 'Administrador añadido; se envió una invitación por correo.' : 'Acceso administrativo concedido a una cuenta existente.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible añadir.'); } finally { setSaving(false); } };
  const update = async (person: AdminUser, changes: Partial<Pick<AdminUser, 'role' | 'active'>>) => { try { const result = await api<{ admin: AdminUser }>(`/api/admin/users/${person.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }); setTeam((current) => current.map((item) => item.id === person.id ? { ...item, ...result.admin } : item)); setNotice('Permisos administrativos actualizados.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible actualizar.'); } };
  return <section className="space-y-4">{adding && <div className="rounded-2xl border border-brand-cyan/30 bg-brand-dark-card p-5"><form onSubmit={add} className="grid gap-4 md:grid-cols-3"><label className={labelClass}>Nombre completo<input name="full_name" required className={inputClass} /></label><label className={labelClass}>Correo<input name="email" type="email" required className={inputClass} /></label><label className={labelClass}>Rol<select name="role" className={inputClass}>{adminRoles.map((role) => <option key={role}>{role}</option>)}</select></label><div className="md:col-span-3 flex justify-end gap-2"><button type="button" onClick={() => setAdding(false)} className="rounded-xl border px-4 py-2 text-xs">Cancelar</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-brand-cyan px-4 py-2 text-xs font-bold text-slate-950"><UserPlus className="h-4 w-4" />Añadir e invitar</button></div></form></div>}<div className="rounded-3xl border border-brand-dark-border bg-brand-dark-card p-5"><div className="mb-4 flex justify-between"><div><h2 className="flex items-center gap-2 font-heading text-lg font-bold"><Users className="h-5 w-5 text-brand-cyan" />Equipo administrativo</h2><p className="text-xs text-slate-400">Solo SuperAdmin puede cambiar roles o revocar acceso.</p></div><button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-xl bg-brand-cyan px-4 py-2 text-xs font-bold text-slate-950"><UserPlus className="h-4 w-4" />Agregar persona</button></div><div className="space-y-3">{team.map((person) => <div key={person.id} className="grid items-center gap-3 rounded-2xl border border-brand-dark-border p-4 md:grid-cols-[1fr_220px_120px]"><div><p className="font-bold">{person.full_name} {person.id === currentAdmin.id && <span className="text-xs text-brand-cyan">(Tú)</span>}</p><p className="text-xs text-slate-400">{person.email}</p><p className="text-[10px] text-slate-500">{person.email_confirmed ? 'Correo confirmado' : person.invited ? 'Invitación pendiente' : 'Sin cuenta Auth detectada'}</p></div><select disabled={person.id === currentAdmin.id || !person.active} value={person.role} onChange={(e) => void update(person, { role: e.target.value as AdminRole })} className={inputClass}>{adminRoles.map((role) => <option key={role}>{role}</option>)}</select><div className="flex justify-end">{person.active ? <button disabled={person.id === currentAdmin.id} onClick={() => { if (confirm(`¿Revocar el acceso de ${person.full_name}?`)) void update(person, { active: false }); }} className="flex items-center gap-1 text-xs text-red-400 disabled:opacity-30"><Trash2 className="h-4 w-4" />Revocar</button> : <button onClick={() => void update(person, { active: true })} className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 className="h-4 w-4" />Reactivar</button>}</div></div>)}</div></div></section>;
}
