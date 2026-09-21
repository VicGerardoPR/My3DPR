import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { acceptPasswordLink, saveRecoveredPassword } from './password-recovery';
function mockClient() {
  const auth = { setSession: vi.fn().mockResolvedValue({ data: { session: {} }, error: null }), getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'mock' } }, error: null }), updateUser: vi.fn().mockResolvedValue({ error: null }), signOut: vi.fn().mockResolvedValue({ error: null }) };
  return { auth, client: { auth } as unknown as SupabaseClient };
}
describe('password recovery', () => {
  it.each(['recovery', 'invite'])('accepts official %s link and validates Auth identity', async (type) => {
    const { auth, client } = mockClient();
    await acceptPasswordLink(client, `#type=${type}&access_token=mock-access&refresh_token=mock-refresh`);
    expect(auth.getUser).toHaveBeenCalled();
  });
  it.each(['', '#type=signup&access_token=mock', '#type=recovery&error=expired', '#type=recovery&access_token=mock'])('rejects missing/invalid links without reusing existing session (%s)', async (hash) => {
    const { client, auth } = mockClient(); await expect(acceptPasswordLink(client, hash)).rejects.toThrow(); expect(auth.setSession).not.toHaveBeenCalled();
  });
  it('rejects expired and unverifiable sessions', async () => {
    const { client, auth } = mockClient(); const link = '#type=recovery&access_token=mock&refresh_token=mock';
    auth.setSession.mockResolvedValueOnce({ data: {}, error: {} });
    await expect(acceptPasswordLink(client, link)).rejects.toThrow();
    auth.getUser.mockResolvedValueOnce({ data: {}, error: {} });
    await expect(acceptPasswordLink(client, link)).rejects.toThrow();
  });
  it('validates confirmation and handles provider update/signout failure', async () => {
    const { client, auth } = mockClient(); const value = 'mock-only-not-a-real-password';
    await expect(saveRecoveredPassword(client, value, 'mismatch')).rejects.toThrow();
    expect(auth.updateUser).not.toHaveBeenCalled();
    auth.updateUser.mockResolvedValueOnce({ error: {} });
    await expect(saveRecoveredPassword(client, value, value)).rejects.toThrow('password update failed');
    expect(auth.signOut).not.toHaveBeenCalled();
    await saveRecoveredPassword(client, value, value);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    auth.signOut.mockResolvedValueOnce({ error: {} });
    await expect(saveRecoveredPassword(client, value, value)).rejects.toThrow('sign out failed');
  });
});
