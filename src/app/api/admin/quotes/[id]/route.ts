import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminErrorResponse, getAdminDatabase, requireAdmin } from '@/lib/admin-auth';

const quoteUpdateSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'NEEDS_INFORMATION', 'QUOTED', 'APPROVED', 'REJECTED', 'PAID', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'COMPLETED', 'CANCELLED']).optional(),
  budget: z.number().nonnegative().max(1_000_000).nullable().optional(),
  admin_notes: z.string().trim().max(5000).nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, 'No changes supplied');

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(request, 'manage_quotes');
    const { id } = await context.params;
    const parsed = quoteUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Revisa los cambios de la cotización.', issues: parsed.error.flatten().fieldErrors }, { status: 400 });

    const db = getAdminDatabase();
    const { data: rpcData, error } = await db.rpc('admin_update_quote', {
      p_actor_user_id: admin.userId,
      p_quote_id: id,
      p_changes: parsed.data,
    });
    const quote = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (error || !quote) {
      if (error?.message.includes('quote not found')) return NextResponse.json({ error: 'Cotización no encontrada.' }, { status: 404 });
      throw new Error(`Could not update quote transaction: ${error?.code || 'missing'}`);
    }
    return NextResponse.json({ quote });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
