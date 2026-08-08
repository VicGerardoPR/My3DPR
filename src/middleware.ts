import { NextRequest, NextResponse } from 'next/server';

// Emails de administradores autorizados (whitelist hardcodeada como fallback)
// En producción con Supabase, la verificación se hace contra la tabla admin_whitelist
const ADMIN_DEMO_EMAIL = 'admin@my3d.pr';
const ADMIN_DEMO_PASSWORD = 'my3d2026'; // solo para modo demo sin Supabase

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplicar a rutas /admin (excluyendo /admin/login)
  const isAdminRoute = pathname.match(/^\/[a-z]{2}\/admin/) && !pathname.includes('/admin/login');

  if (!isAdminRoute) {
    return NextResponse.next();
  }

  // Verificar cookie de sesión admin
  const adminSession = request.cookies.get('admin_session');

  if (!adminSession || adminSession.value !== 'authenticated') {
    // Extraer el lang de la URL
    const lang = pathname.split('/')[1] || 'es';
    const loginUrl = new URL(`/${lang}/admin/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/(es|en)/admin/:path*',
  ],
};
