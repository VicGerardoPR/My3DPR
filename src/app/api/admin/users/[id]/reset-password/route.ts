import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminErrorResponse, getAdminDatabase, requireAdmin, writeAdminAudit } from '@/lib/admin-auth';
import { adminRecoveryUrl, limitAdminRequest } from '@/lib/admin-email';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(request, 'manage_admins');
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Administrador inválido.' }, { status: 400 });
    const db = getAdminDatabase();
    await limitAdminRequest(db, actor, 'PASSWORD_RESET', id);
    const { data: target, error } = await db.from('admin_whitelist')
      .select('id,user_id,email,active').eq('id', id).maybeSingle();
    if (error) throw new Error('Could not verify reset target');
    if (!target?.active || !z.string().uuid().safeParse(target.user_id).success || target.user_id === actor.userId) {
      await writeAdminAudit(db, actor, 'ADMIN_PASSWORD_RESET_REJECTED', 'ADMIN', id);
      return NextResponse.json({ error: 'Elige otro administrador activo con cuenta vinculada.' }, { status: 400 });
    }
    const { data: identity, error: identityError } = await db.auth.admin.getUserById(target.user_id);
    if (identityError || identity.user?.id !== target.user_id || !identity.user.email || identity.user.email.toLowerCase() !== target.email.toLowerCase()) {
      await writeAdminAudit(db, actor, 'ADMIN_PASSWORD_RESET_REJECTED', 'ADMIN', id);
      return NextResponse.json({ error: 'No fue posible verificar la cuenta vinculada.' }, { status: 400 });
    }
    await requireAdmin(request, 'manage_admins');
    const { error: resetError } = await db.auth.resetPasswordForEmail(identity.user.email, { redirectTo: adminRecoveryUrl() });
    await writeAdminAudit(db, actor, resetError ? 'ADMIN_PASSWORD_RESET_FAILED' : 'ADMIN_PASSWORD_RESET_SENT', 'ADMIN', id);
    if (resetError) return NextResponse.json({ error: 'No fue posible enviar el enlace. Intenta más tarde.' }, { status: 502 });
    return NextResponse.json({ sent: true });
  } catch (error) { return adminErrorResponse(error); }
}
