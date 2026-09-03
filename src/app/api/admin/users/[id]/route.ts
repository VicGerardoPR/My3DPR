import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminErrorResponse, getAdminDatabase, requireAdmin } from '@/lib/admin-auth';
import { ADMIN_ROLES } from '@/lib/admin-permissions';

const adminUpdateSchema = z.object({
  full_name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  active: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'No changes supplied');

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAdmin(request, 'manage_admins');
    const { id } = await context.params;
    const parsed = adminUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Revisa los cambios del administrador.', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    if (id === actor.id && (parsed.data.active === false || (parsed.data.role && parsed.data.role !== 'SUPER_ADMIN'))) {
      return NextResponse.json({ error: 'No puedes revocar ni degradar tu propia cuenta SuperAdmin.' }, { status: 400 });
    }

    const db = getAdminDatabase();
    const { data: rpcData, error } = await db.rpc('admin_update_access', {
      p_actor_user_id: actor.userId,
      p_target_admin_id: id,
      p_role: parsed.data.role ?? null,
      p_active: parsed.data.active ?? null,
      p_full_name: parsed.data.full_name ?? null,
    });
    const data = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    if (error || !data) {
      if (error?.message?.includes('cannot remove the last active super admin')) return NextResponse.json({ error: 'Debe permanecer al menos un SuperAdmin activo.' }, { status: 409 });
      if (error?.code === 'PGRST116') return NextResponse.json({ error: 'Administrador no encontrado.' }, { status: 404 });
      throw new Error(`Could not update administrator: ${error?.code || 'missing'}`);
    }
    return NextResponse.json({ admin: data });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const revokeRequest = new NextRequest(request.url, { method: 'PATCH', headers: request.headers, body: JSON.stringify({ active: false }) });
  return PATCH(revokeRequest, { params: Promise.resolve({ id }) });
}
