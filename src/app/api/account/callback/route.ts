import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') || '/es/account';
  const safeNext = /^\/(es|en)\/account(?:\?.*)?$/.test(next) ? next : '/es/account';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = NextResponse.redirect(new URL(safeNext, request.url));
  if (!code || !url || !key) return NextResponse.redirect(new URL(`${safeNext}?auth=error`, request.url));

  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { error } = await client.auth.exchangeCodeForSession(code);
  return error ? NextResponse.redirect(new URL(`${safeNext}?auth=error`, request.url)) : response;
}
