import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { authCredentialsSchema, guestAccessSchema } from '@/lib/account';

function serverClient(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const response = NextResponse.json({ ok: true });
  const supabase = serverClient(request, response);
  if (!supabase) return NextResponse.json({ error: 'El servicio de cuentas no está configurado.' }, { status: 503 });

  if (action === 'signup') {
    const parsed = authCredentialsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Usa un email válido y una contraseña de al menos 10 caracteres con letras y números.' }, { status: 400 });
    const lang = body.lang === 'en' ? 'en' : 'es';
    const site = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    const { data, error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${site}/api/account/callback?next=/${lang}/account` } });
    if (error) return NextResponse.json({ error: 'No fue posible crear la cuenta. Si el email ya existe, intenta iniciar sesión.' }, { status: 400 });
    const payload = { authenticated: Boolean(data.session), message: data.session ? 'Cuenta creada.' : 'Revisa tu email para confirmar la cuenta.' };
    return NextResponse.json(payload, { status: 201, headers: response.headers });
  }

  if (action === 'login') {
    const parsed = authCredentialsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Credenciales inválidas.' }, { status: 400 });
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.session) return NextResponse.json({ error: 'Email o contraseña incorrectos, o email pendiente de confirmar.' }, { status: 401 });
    return NextResponse.json({ authenticated: true }, { headers: response.headers });
  }

  if (action === 'guest-link') {
    const parsed = guestAccessSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    const lang = body.lang === 'en' ? 'en' : 'es';
    const site = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
    // Intentionally generic to prevent account/order enumeration.
    await supabase.auth.signInWithOtp({ email: parsed.data.email, options: { shouldCreateUser: true, emailRedirectTo: `${site}/api/account/callback?next=/${lang}/account` } });
    return NextResponse.json({ message: 'Si el email es válido, recibirás un enlace seguro para ver tus compras.' }, { headers: response.headers });
  }
  return NextResponse.json({ error: 'Acción inválida.' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ authenticated: false });
  const supabase = serverClient(request, response);
  if (supabase) await supabase.auth.signOut();
  return response;
}
