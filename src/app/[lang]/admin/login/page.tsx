'use client';

import { useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Eye, EyeOff, Lock, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { Locale } from '@/lib/i18n';

export default function AdminLoginPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || `/${lang}/admin`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(redirect);
        router.refresh();
      } else {
        setError(result.error || 'Credenciales incorrectas.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-brand-orange/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[200px] bg-brand-cyan/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-orange/20 border border-brand-orange/50 shadow-orange-glow mb-4">
            <ShieldCheck className="w-8 h-8 text-brand-orange" />
          </div>
          <h1 className="font-heading font-black text-2xl text-slate-100">Panel Administrativo</h1>
          <p className="text-sm text-slate-400 mt-1">MY3D.PR — Acceso Restringido</p>
        </div>

        {/* Login Card */}
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Email Administrativo
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@my3d.pr"
                  required
                  autoComplete="email"
                  className="w-full bg-brand-dark border border-brand-dark-border text-slate-100 text-sm rounded-xl pl-10 pr-4 py-3 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange/30 placeholder:text-slate-600 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-brand-dark border border-brand-dark-border text-slate-100 text-sm rounded-xl pl-10 pr-11 py-3 focus:border-brand-orange focus:outline-none focus:ring-1 focus:ring-brand-orange/30 placeholder:text-slate-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2.5 bg-red-950/50 border border-red-800/50 text-red-300 text-xs px-4 py-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-orange to-brand-orange-light text-slate-950 font-extrabold text-sm py-3.5 rounded-xl flex items-center justify-center gap-2.5 shadow-orange-glow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando acceso...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acceder al Panel Admin</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-brand-dark-border">
            <p className="text-[10px] text-slate-600 text-center font-mono">
              Acceso restringido a administradores autorizados de MY3D.PR
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <a href={`/${lang}`} className="text-xs text-slate-500 hover:text-brand-cyan transition-colors">
            ← Volver a la tienda
          </a>
        </div>
      </div>
    </div>
  );
}
