import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from './admin-session';
import { canAdmin, isAdminRole, permissionsForRole, type AdminPermission, type AdminRole } from './admin-permissions';

export type AuthorizedAdmin = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: AdminRole;
  permissions: AdminPermission[];
};

export class AdminAuthorizationError extends Error {
  constructor(public status: 401 | 403 | 503, message: string) {
    super(message);
  }
}

export function getAdminDatabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new AdminAuthorizationError(503, 'Servicio administrativo no configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireAdmin(request: NextRequest, permission: AdminPermission): Promise<AuthorizedAdmin> {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const canonicalOrigin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.my3dpr.site';
    const allowedOrigins = new Set([canonicalOrigin]);
    if (process.env.NODE_ENV !== 'production') allowedOrigins.add(request.nextUrl.origin);
    if (!origin || !allowedOrigins.has(origin)) throw new AdminAuthorizationError(403, 'Origen administrativo no autorizado.');
  }

  const session = await verifyAdminSession(request.cookies.get('admin_session')?.value, process.env.ADMIN_SESSION_SECRET || '');
  if (!session) throw new AdminAuthorizationError(401, 'Sesión administrativa inválida o expirada.');

  const db = getAdminDatabase();
  const { data, error } = await db.from('admin_whitelist')
    .select('id,user_id,email,full_name,role,active,session_version')
    .eq('user_id', session.userId)
    .eq('session_version', session.sessionVersion)
    .eq('active', true)
    .single();
  if (error || !data || !isAdminRole(data.role)) throw new AdminAuthorizationError(401, 'Acceso administrativo revocado.');
  if (!canAdmin(data.role, permission)) throw new AdminAuthorizationError(403, 'Tu rol no permite realizar esta acción.');

  return {
    id: data.id,
    userId: data.user_id,
    email: data.email,
    fullName: data.full_name,
    role: data.role,
    permissions: permissionsForRole(data.role),
  };
}

export async function writeAdminAudit(
  db: SupabaseClient,
  admin: AuthorizedAdmin,
  action: string,
  targetType: 'ADMIN' | 'PRODUCT' | 'QUOTE',
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await db.from('admin_audit_log').insert({
    actor_user_id: admin.userId,
    actor_email: admin.email,
    actor_role: admin.role,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  });
  if (error) throw new Error(`Could not write admin audit: ${error.code}`);
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(JSON.stringify({ area: 'admin-api', message: error instanceof Error ? error.message : 'unknown' }));
  return NextResponse.json({ error: 'No fue posible completar la operación.' }, { status: 500 });
}
