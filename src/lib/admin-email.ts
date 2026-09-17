import 'server-only';
import { AdminAuthorizationError, writeAdminAudit, type AuthorizedAdmin, type getAdminDatabase } from './admin-auth';

type Database = ReturnType<typeof getAdminDatabase>;
export function adminRecoveryUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.my3dpr.site');
  if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost')) {
    throw new Error('Invalid canonical recovery origin');
  }
  return new URL('/es/account/recovery', url.origin).href;
}

// Durable, atomic limits shared across workers; fail closed if the RPC is missing.
export async function limitAdminRequest(db: Database, actor: AuthorizedAdmin, action: string, targetId: string | null = null) {
  const { data, error } = await db.rpc('consume_checkout_rate_limit', {
    p_bucket: `admin-management:${actor.userId}:${action}`,
    p_limit: action === 'LIST' ? 60 : action === 'UPDATE' ? 30 : 5,
    p_window_seconds: 3600,
  });
  if (error || typeof data !== 'boolean') throw new AdminAuthorizationError(503, 'Control de solicitudes no disponible.');
  await writeAdminAudit(db, actor, `ADMIN_${action}_${data ? 'REQUESTED' : 'RATE_LIMITED'}`, 'ADMIN', targetId);
  if (!data) throw new AdminAuthorizationError(429, 'Demasiadas solicitudes. Intenta de nuevo más tarde.');
}
