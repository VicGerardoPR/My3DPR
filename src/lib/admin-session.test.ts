import { describe, expect, it } from 'vitest';
import { createAdminSession, verifyAdminSession } from './admin-session';

const secret = 'test-secret-at-least-32-characters-long';
const admin = { userId: '123e4567-e89b-12d3-a456-426614174000', email: 'admin@example.com', role: 'ADMIN' as const, sessionVersion: 4 };

describe('admin session signing', () => {
  it('accepts a signed non-expired versioned session', async () => {
    const token = await createAdminSession(admin, secret, 60);
    await expect(verifyAdminSession(token, secret)).resolves.toMatchObject({ userId: admin.userId, email: admin.email, role: 'ADMIN', sessionVersion: 4, version: 1 });
  });

  it('rejects a forged session', async () => {
    const token = await createAdminSession(admin, secret, 60);
    await expect(verifyAdminSession(token.replace(/.$/, token.endsWith('a') ? 'b' : 'a'), secret)).resolves.toBeNull();
  });

  it('rejects expired sessions', async () => {
    const token = await createAdminSession(admin, secret, -1);
    await expect(verifyAdminSession(token, secret)).resolves.toBeNull();
  });

  it('rejects weak signing secrets and unknown roles', async () => {
    await expect(createAdminSession(admin, 'too-short', 60)).rejects.toThrow(/32/);
    const token = await createAdminSession({ ...admin, role: 'OWNER' as never }, secret, 60);
    await expect(verifyAdminSession(token, secret)).resolves.toBeNull();
  });
});
