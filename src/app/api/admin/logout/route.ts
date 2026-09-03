import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const canonicalOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.my3dpr.site';
  const origin = request.headers.get('origin');
  if (process.env.NODE_ENV === 'production' && origin !== canonicalOrigin) {
    return NextResponse.json({ error: 'Origen no autorizado.' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  for (const name of ['admin_session', 'admin_name']) {
    response.cookies.set(name, '', { httpOnly: name === 'admin_session', secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 0, path: '/' });
  }
  return response;
}
