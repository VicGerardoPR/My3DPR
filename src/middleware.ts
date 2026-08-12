import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = pathname.split('/')[1] === 'en' ? 'en' : 'es';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-my3d-locale', locale);

  // Solo aplicar a rutas /admin (excluyendo /admin/login)
  const isAdminRoute = pathname.match(/^\/[a-z]{2}\/admin/) && !pathname.includes('/admin/login');

  if (!isAdminRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Verificar cookie de sesión admin
  const adminSession = await verifyAdminSession(
    request.cookies.get('admin_session')?.value,
    process.env.ADMIN_SESSION_SECRET || '',
  );

  if (!adminSession) {
    // Extraer el lang de la URL
    const lang = pathname.split('/')[1] || 'es';
    const loginUrl = new URL(`/${lang}/admin/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
