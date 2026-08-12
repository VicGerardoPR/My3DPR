import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const quoteSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(254),
  customer_phone: z.string().trim().max(30).optional(),
  project_name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(20).max(5000),
  desired_size: z.string().trim().max(120).optional(),
  quantity: z.number().int().min(1).max(100),
  colors: z.string().trim().max(200).optional(),
  material: z.string().trim().max(100).optional(),
  budget: z.number().nonnegative().max(1_000_000).optional(),
});

const attempts = new Map<string, number[]>();
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 3) return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.' }, { status: 429 });
  attempts.set(ip, [...recent, now]);

  const parsed = quoteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos de la solicitud.' }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'El servicio de cotizaciones no está configurado.' }, { status: 503 });

  const client = createClient(url, key, { auth: { persistSession: false } });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const requestNumber = `MY3D-Q-${new Date().getUTCFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { error } = await client.from('custom_requests').insert({ ...parsed.data, customer_email: parsed.data.customer_email.toLowerCase(), request_number: requestNumber, status: 'SUBMITTED', files: [] });
    if (!error) return NextResponse.json({ requestNumber, status: 'SUBMITTED' }, { status: 201 });
    if (error.code !== '23505') {
      console.error(JSON.stringify({ area: 'custom-quote', code: error.code }));
      return NextResponse.json({ error: 'No fue posible registrar la solicitud.' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'No fue posible generar un número de solicitud único.' }, { status: 500 });
}
