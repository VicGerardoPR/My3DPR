import { NextRequest, NextResponse } from 'next/server';
import { validateAdminLogin } from '@/lib/auth';
import { createAdminSession } from '@/lib/admin-session';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email y contraseña requeridos.' }, { status: 400 });
    }

    const result = await validateAdminLogin(email, password);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 401 });
    }

    const sessionSecret = process.env.ADMIN_SESSION_SECRET;
    if (!sessionSecret) {
      return NextResponse.json({ success: false, error: 'Autenticación administrativa no configurada.' }, { status: 503 });
    }
    const session = await createAdminSession({ email: email.toLowerCase().trim(), role: result.role || 'ADMIN' }, sessionSecret);

    // Set a signed, httpOnly session cookie.
    const response = NextResponse.json({
      success: true,
      name: result.name,
      role: result.role,
    });

    response.cookies.set('admin_session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    });

    // Store admin name in a readable cookie for UI display
    response.cookies.set('admin_name', result.name || 'Admin', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Error interno del servidor.' }, { status: 500 });
  }
}
