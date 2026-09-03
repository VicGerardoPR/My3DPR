import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminLogin } from '@/lib/auth';
import { createAdminSession } from '@/lib/admin-session';
import { consumeCheckoutRateLimit } from '@/lib/payment-db';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(256),
});

async function fingerprint(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  try {
    const canonicalOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.my3dpr.site';
    const origin = request.headers.get('origin');
    if (process.env.NODE_ENV === 'production' && origin !== canonicalOrigin) return json({ success: false, error: 'Origen no autorizado.' }, 403);

    const parsed = loginSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ success: false, error: 'Email y contraseña requeridos.' }, 400);
    const { email, password } = parsed.data;
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const [ipAllowed, emailAllowed] = await Promise.all([
      consumeCheckoutRateLimit(`admin-login:ip:${await fingerprint(ip)}`, 10, 900),
      consumeCheckoutRateLimit(`admin-login:email:${await fingerprint(email)}`, 5, 900),
    ]);
    if (!ipAllowed || !emailAllowed) return json({ success: false, error: 'Demasiados intentos. Intenta nuevamente más tarde.' }, 429);

    const result = await validateAdminLogin(email, password);
    if (!result.success || !result.userId || !result.role || !result.sessionVersion) return json({ success: false, error: result.error || 'Email o contraseña incorrectos.' }, 401);

    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    if (!sessionSecret || sessionSecret.length < 32) return json({ success: false, error: 'Autenticación administrativa no configurada.' }, 503);
    const session = await createAdminSession({ userId: result.userId, email, role: result.role, sessionVersion: result.sessionVersion }, sessionSecret);
    const response = json({ success: true, name: result.name, role: result.role });
    response.cookies.set('admin_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error(JSON.stringify({ area: 'admin-login', message: error instanceof Error ? error.message : 'unknown' }));
    return json({ success: false, error: 'No fue posible validar el acceso.' }, 500);
  }
}
