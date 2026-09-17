import type { SupabaseClient } from '@supabase/supabase-js';

// The service-side email APIs use the official implicit flow (no browser PKCE
// verifier exists). Accept only invite/recovery links, not a persisted login.
export async function acceptPasswordLink(client: SupabaseClient, hash: string) {
  const values = new URLSearchParams(hash.replace(/^#/, ''));
  if (values.has('error') || !['recovery', 'invite'].includes(values.get('type') || '')) throw new Error('invalid link');
  const access_token = values.get('access_token');
  const refresh_token = values.get('refresh_token');
  if (!access_token || !refresh_token) throw new Error('missing link');
  const { data, error } = await client.auth.setSession({ access_token, refresh_token });
  if (error || !data.session) throw new Error('expired link');
  const { data: identity, error: identityError } = await client.auth.getUser();
  if (identityError || !identity.user) throw new Error('invalid identity');
}

export async function saveRecoveredPassword(client: SupabaseClient, password: string, confirmation: string) {
  if (password.length < 12 || password.length > 128 || password !== confirmation) throw new Error('password validation');
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error('password update failed');
  // Supabase revokes refresh tokens; the DB migration separately invalidates
  // signed admin cookies when encrypted_password changes.
  const { error: signOutError } = await client.auth.signOut({ scope: 'global' });
  if (signOutError) throw new Error('password saved; sign out failed');
}
