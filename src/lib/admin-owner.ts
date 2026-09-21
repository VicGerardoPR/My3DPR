import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

// Deployment-controlled identity, never request metadata or whitelist email.
export const OWNER_EMAIL = 'victor.rivera@arcanointelligence.com';
export async function isVerifiedOwner(db: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error) throw new Error('Owner identity verification unavailable');
  return data.user?.id === userId && data.user.email?.toLowerCase() === OWNER_EMAIL
    && Boolean(data.user.email_confirmed_at);
}
