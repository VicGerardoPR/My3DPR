'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { acceptPasswordLink, saveRecoveredPassword } from '@/lib/password-recovery';

export function PasswordRecovery() {
  const client = useRef<SupabaseClient | null>(null);
  const started = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Verificando enlace…');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = window.location.hash;
    // Remove tokens before any further navigation; never persist or log them.
    window.history.replaceState(null, '', window.location.pathname);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) { setMessage('Servicio no disponible.'); return; }
    client.current = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } });
    void acceptPasswordLink(client.current, hash).then(() => { setReady(true); setMessage('Elige tu contraseña. Nadie del equipo puede verla.'); })
      .catch(() => { client.current = null; setMessage('Enlace inválido o expirado. Solicita uno nuevo al propietario.'); });
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || !client.current || busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      await saveRecoveredPassword(client.current, String(data.get('password') || ''), String(data.get('confirmation') || ''));
      form.reset(); setReady(false); client.current = null;
      setMessage('Contraseña guardada. Inicia sesión con tu nueva contraseña.');
    } catch { setMessage('No se pudo completar el cambio. Usa 12–128 caracteres y confirma que coincidan; si persiste, solicita otro enlace.'); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto max-w-lg space-y-5 px-4 py-12">
    <h1 className="text-2xl font-bold">Configurar contraseña</h1>
    <p role="status">{message}</p>
    {ready && <form onSubmit={submit} className="space-y-4">
      <label className="block">Nueva contraseña<input className="block w-full rounded border bg-transparent p-3" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      <label className="block">Confirmar contraseña<input className="block w-full rounded border bg-transparent p-3" name="confirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
      <button disabled={busy} className="rounded bg-brand-cyan p-3 text-black">{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
    </form>}
    <Link href="/es/admin/login" className="block underline">Ir al inicio de sesión</Link>
  </main>;
}
