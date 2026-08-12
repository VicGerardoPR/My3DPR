import { describe, expect, it } from 'vitest';
import { createAdminSession, verifyAdminSession } from './admin-session';

describe('admin session signing', () => {
  it('accepts a signed non-expired session', async () => {
    const token = await createAdminSession({ email: 'admin@example.com', role: 'ADMIN' }, 'test-secret', 60);
    await expect(verifyAdminSession(token, 'test-secret')).resolves.toMatchObject({ email: 'admin@example.com' });
  });

  it('rejects a forged session', async () => {
    const token = await createAdminSession({ email: 'admin@example.com', role: 'ADMIN' }, 'test-secret', 60);
    await expect(verifyAdminSession(token.replace(/.$/, token.endsWith('a') ? 'b' : 'a'), 'test-secret')).resolves.toBeNull();
  });

  it('rejects expired sessions', async () => {
    const token = await createAdminSession({ email: 'admin@example.com', role: 'ADMIN' }, 'test-secret', -1);
    await expect(verifyAdminSession(token, 'test-secret')).resolves.toBeNull();
  });
});
