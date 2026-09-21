import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminErrorResponse, getAdminDatabase, requireAdmin } from '@/lib/admin-auth';
import { ADMIN_ROLES } from '@/lib/admin-permissions';
import { adminRecoveryUrl, limitAdminRequest } from '@/lib/admin-email';

const createAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  full_name: z.string().trim().min(2).max(120),
  role: z.enum(ADMIN_ROLES),
}).strict();

async function listAllAuthUsers(db: ReturnType<typeof getAdminDatabase>) {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not inspect auth users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
  throw new Error('Auth user directory exceeds the supported administrative scan limit.');
}

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAdmin(request, 'manage_admins');
    const db = getAdminDatabase();
    await limitAdminRequest(db, actor, 'LIST');
    const [{ data: admins, error }, authUsers] = await Promise.all([
      db.from('admin_whitelist').select('id,user_id,email,full_name,role,active,created_at,updated_at,last_login_at').order('created_at'),
      listAllAuthUsers(db),
    ]);
    if (error) throw new Error(`Could not list administrators: ${error.code}`);
    const authById = new Map(authUsers.map((user) => [user.id, user]));
    return NextResponse.json({
      admins: (admins || []).map((admin) => {
        const authUser = authById.get(admin.user_id);
        return { ...admin, can_reset_password: admin.active && admin.user_id !== actor.userId && Boolean(authUser && authUser.email?.toLowerCase() === admin.email.toLowerCase()), invited: Boolean(authUser), email_confirmed: Boolean(authUser?.email_confirmed_at), last_sign_in_at: authUser?.last_sign_in_at || null };
      }),
    });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let newlyInvitedUserId: string | null = null;
  try {
    const admin = await requireAdmin(request, 'manage_admins');
    const parsed = createAdminSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Revisa los datos del administrador.', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
    const value = parsed.data;
    const db = getAdminDatabase();

    await limitAdminRequest(db, admin, 'INVITE');
    const { data: existing, error: existingError } = await db.from('admin_whitelist').select('id,active').eq('email', value.email).maybeSingle();
    if (existingError) throw new Error('Could not inspect administrator');
    if (existing?.active) return NextResponse.json({ error: 'Ese correo ya tiene acceso administrativo.' }, { status: 409 });

    const authUsers = await listAllAuthUsers(db);
    let targetUserId = authUsers.find((user) => user.email?.toLowerCase() === value.email)?.id;
    const invited = !targetUserId;
    if (!targetUserId) {
      const { data: invitation, error: inviteError } = await db.auth.admin.inviteUserByEmail(value.email, {
        data: { full_name: value.full_name },
        redirectTo: adminRecoveryUrl(),
      });
      if (inviteError) throw new Error(`Could not invite administrator: ${inviteError.status}`);
      targetUserId = invitation.user.id;
      newlyInvitedUserId = targetUserId;
    }

    const { data, error } = await db.rpc('admin_grant_access', {
      p_actor_user_id: admin.userId,
      p_target_user_id: targetUserId,
      p_email: value.email,
      p_full_name: value.full_name,
      p_role: value.role,
      p_invited: invited,
    });
    if (error || !data) throw new Error(`Could not grant admin access: ${error?.code || 'missing'}`);
    const granted = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ admin: granted, invited }, { status: 201 });
  } catch (error) {
    if (newlyInvitedUserId) {
      try {
        const { error: cleanupError } = await getAdminDatabase().auth.admin.deleteUser(newlyInvitedUserId);
        if (cleanupError) console.error(JSON.stringify({ area: 'admin-invite-compensation', code: cleanupError.status || 'unknown' }));
      } catch { console.error(JSON.stringify({ area: 'admin-invite-compensation', code: 'exception' })); }
    }
    return adminErrorResponse(error);
  }
}
