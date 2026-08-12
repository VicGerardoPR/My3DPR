import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { publicOrderSchema } from '@/lib/account';

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: 'El servicio de cuentas no está configurado.' }, { status: 503 });
  const response = NextResponse.json({ ok: true });
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user?.email) return NextResponse.json({ authenticated: false, orders: [] }, { status: 401, headers: response.headers });
  const { data, error } = await client.from('orders').select('order_number,status,payment_status,total_amount,currency,items,created_at,tracking_number,carrier').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'No fue posible cargar el historial.' }, { status: 500, headers: response.headers });
  return NextResponse.json({ authenticated: true, email: userData.user.email, orders: (data || []).map((order) => publicOrderSchema.parse(order)) }, { headers: response.headers });
}
