import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const schema = z.object({ email: z.string().trim().email().max(254), website: z.string().max(0).optional() });
const attempts = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const type = request.headers.get('content-type') || '';
  const raw = type.includes('application/json') ? await request.json().catch(() => null) : Object.fromEntries((await request.formData()).entries());
  const parsed = schema.safeParse(raw);
  const acceptsJson = type.includes('application/json');
  const respond = (message: string, status: number) => acceptsJson
    ? NextResponse.json({ message }, { status })
    : NextResponse.redirect(new URL(`/?newsletter=${status < 400 ? 'success' : 'error'}`, request.url), 303);
  if (!parsed.success) return respond('Correo electrónico inválido.', 400);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 5) return respond('Demasiados intentos.', 429);
  attempts.set(ip, [...recent, now]);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return respond('Newsletter no configurado.', 503);
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await client.from('newsletter_subscribers').upsert({ email: parsed.data.email.toLowerCase(), status: 'ACTIVE' }, { onConflict: 'email', ignoreDuplicates: true });
  if (error) return respond('No fue posible completar la suscripción.', 500);
  return respond('Suscripción confirmada.', 201);
}
