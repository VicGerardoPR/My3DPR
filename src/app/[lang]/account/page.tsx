'use client';

import { FormEvent, use, useEffect, useState } from 'react';
import { LogIn, LogOut, Mail, Package, UserPlus } from 'lucide-react';
import { Locale } from '@/lib/i18n';
import type { PublicOrder } from '@/lib/account';

type Mode = 'login' | 'signup' | 'guest';

export default function AccountPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const isEnglish = lang === 'en';
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orders, setOrders] = useState<PublicOrder[]>([]);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    const response = await fetch('/api/account/orders', { cache: 'no-store' });
    if (response.ok) {
      const result = await response.json();
      setOrders(result.orders || []);
      setAccountEmail(result.email || null);
    } else {
      setOrders([]);
      setAccountEmail(null);
    }
    setLoading(false);
  };

  useEffect(() => { void loadOrders(); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true); setError(null); setMessage(null);
    const action = mode === 'guest' ? 'guest-link' : mode;
    const response = await fetch('/api/account', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, email, password, lang }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || (isEnglish ? 'The request failed.' : 'La solicitud falló.'));
    else {
      setMessage(result.message || (isEnglish ? 'Success.' : 'Operación completada.'));
      if (result.authenticated) await loadOrders();
    }
    setSubmitting(false);
  };

  const logout = async () => {
    await fetch('/api/account', { method: 'DELETE' });
    setOrders([]); setAccountEmail(null); setMessage(null);
  };

  if (loading) return <div className="container mx-auto max-w-4xl px-4 py-16 text-center text-sm text-slate-400">{isEnglish ? 'Loading account…' : 'Cargando cuenta…'}</div>;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
      <header className="rounded-3xl border border-brand-dark-border bg-brand-dark-card p-6">
        <h1 className="font-heading text-2xl font-black text-slate-100">{isEnglish ? 'My MY3D.PR Account' : 'Mi Cuenta MY3D.PR'}</h1>
        <p className="mt-1 text-xs text-slate-400">{accountEmail || (isEnglish ? 'Sign in, create an account, or securely retrieve a guest purchase.' : 'Inicia sesión, crea una cuenta o recupera de forma segura una compra guest.')}</p>
      </header>

      {accountEmail ? (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold text-slate-100">{isEnglish ? `Orders (${orders.length})` : `Órdenes (${orders.length})`}</h2>
            <button onClick={logout} className="flex items-center gap-2 rounded-xl border border-brand-dark-border px-4 py-2 text-xs font-bold text-slate-300"><LogOut className="h-4 w-4" />{isEnglish ? 'Sign out' : 'Cerrar sesión'}</button>
          </div>
          {orders.length === 0 ? (
            <div className="rounded-3xl border border-brand-dark-border bg-brand-dark-card p-10 text-center">
              <Package className="mx-auto h-9 w-9 text-brand-cyan" />
              <p className="mt-3 text-sm text-slate-300">{isEnglish ? 'No purchases are associated with this verified email yet.' : 'Todavía no hay compras asociadas a este email verificado.'}</p>
            </div>
          ) : orders.map((order) => (
            <article key={order.order_number} className="rounded-3xl border border-brand-dark-border bg-brand-dark-card p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="font-bold text-slate-100">{order.order_number}</h3><time className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString(isEnglish ? 'en-US' : 'es-PR')}</time></div>
                <div className="text-right"><span className="rounded-full bg-brand-cyan/15 px-3 py-1 text-xs font-bold text-brand-cyan">{order.status}</span><p className="mt-2 font-black text-slate-100">{new Intl.NumberFormat(isEnglish ? 'en-US' : 'es-PR', { style: 'currency', currency: order.currency }).format(order.total_amount)}</p></div>
              </div>
              <p className="text-xs text-slate-400">{isEnglish ? 'Payment' : 'Pago'}: {order.payment_status}</p>
              {order.tracking_number && <a className="text-xs font-bold text-brand-cyan hover:underline" href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(order.tracking_number)}`} target="_blank" rel="noreferrer">{order.carrier || 'Tracking'}: {order.tracking_number}</a>}
            </article>
          ))}
        </section>
      ) : (
        <section className="mx-auto max-w-lg rounded-3xl border border-brand-dark-border bg-brand-dark-card p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-2 mb-6">
            {(['login','signup','guest'] as Mode[]).map((item) => <button key={item} onClick={() => { setMode(item); setError(null); setMessage(null); }} className={`rounded-xl px-2 py-2 text-xs font-bold ${mode === item ? 'bg-brand-cyan text-slate-950' : 'bg-brand-dark text-slate-300'}`}>{item === 'login' ? (isEnglish ? 'Sign in' : 'Entrar') : item === 'signup' ? (isEnglish ? 'Create account' : 'Crear cuenta') : 'Guest'}</button>)}
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-xs font-semibold text-slate-300">Email<input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-dark-border bg-brand-dark px-3 py-3 text-slate-100" /></label>
            {mode !== 'guest' && <label className="block text-xs font-semibold text-slate-300">{isEnglish ? 'Password' : 'Contraseña'}<input type="password" required minLength={10} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-brand-dark-border bg-brand-dark px-3 py-3 text-slate-100" /><span className="mt-1 block text-[10px] text-slate-500">{isEnglish ? 'At least 10 characters, including letters and numbers.' : 'Mínimo 10 caracteres, incluyendo letras y números.'}</span></label>}
            {mode === 'guest' && <p className="text-xs leading-relaxed text-slate-400">{isEnglish ? 'We will email you a secure link. Only after verifying the email can its guest purchases be viewed.' : 'Te enviaremos un enlace seguro. Solo después de verificar el email podrás ver sus compras guest.'}</p>}
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-cyan py-3 text-xs font-black text-slate-950 disabled:opacity-50">{mode === 'guest' ? <Mail className="h-4 w-4" /> : mode === 'signup' ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}{submitting ? (isEnglish ? 'Processing…' : 'Procesando…') : mode === 'login' ? (isEnglish ? 'SIGN IN' : 'INICIAR SESIÓN') : mode === 'signup' ? (isEnglish ? 'CREATE ACCOUNT' : 'CREAR CUENTA') : (isEnglish ? 'SEND SECURE LINK' : 'ENVIAR ENLACE SEGURO')}</button>
            {message && <p role="status" className="text-xs text-green-400">{message}</p>}{error && <p role="alert" className="text-xs text-red-400">{error}</p>}
          </form>
        </section>
      )}
    </div>
  );
}
