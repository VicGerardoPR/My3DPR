import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ create: vi.fn(), session: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }));
vi.mock('@/lib/admin-session', () => ({ verifyAdminSession: mocks.session }));
import { requireAdmin } from './admin-auth';
import { GET, POST } from '@/app/api/admin/users/route';
import { PATCH, DELETE } from '@/app/api/admin/users/[id]/route';
import { POST as reset } from '@/app/api/admin/users/[id]/reset-password/route';
const ownerId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';
const email = 'victor.rivera@arcanointelligence.com';
let actor: Record<string, unknown>;
let target: Record<string, unknown> | null;
let ownerEmail: string;
let confirmed: boolean;
let identityFailure: boolean;
let directory: { id: string; email: string }[];
let db: ReturnType<typeof setup>;
function setup() {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    single: vi.fn(async () => ({ data: actor, error: null })),
    maybeSingle: vi.fn(async () => ({ data: target, error: null })),
    order: vi.fn(async () => ({ data: target ? [target] : [], error: null })),
    insert: vi.fn(async () => ({ error: null })),
  };
  return {
    query, from: vi.fn(() => query),
    rpc: vi.fn(async (name: string) => ({ data: name === 'consume_checkout_rate_limit' ? true : { id: targetId }, error: null })),
    auth: {
      admin: {
        getUserById: vi.fn(async (id: string) => ({ data: { user: { id, email: id === ownerId ? ownerEmail : 'admin@example.test', email_confirmed_at: confirmed ? '2026-01-01' : null } }, error: identityFailure ? { status: 503 } : null })),
        listUsers: vi.fn(async () => ({ data: { users: directory }, error: null })),
        inviteUserByEmail: vi.fn(async () => ({ data: { user: { id: targetId } }, error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
      },
      resetPasswordForEmail: vi.fn(async () => ({ error: null as null | { status: number } })),
    },
  };
}
const req = (method = 'GET', body?: object) => new NextRequest('https://www.my3dpr.site/api/admin/users', { method, headers: { origin: 'https://www.my3dpr.site' }, ...(body ? { body: JSON.stringify(body) } : {}) });
const ctx = (id = targetId) => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SITE_URL = 'https://www.my3dpr.site';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-only';
  actor = { id: ownerId, user_id: ownerId, email, full_name: 'Owner', role: 'SUPER_ADMIN', active: true, session_version: 1 };
  target = { id: targetId, user_id: targetId, email: 'admin@example.test', active: true };
  ownerEmail = email; confirmed = true; identityFailure = false; directory = [{ id: targetId, email: 'admin@example.test' }];
  mocks.session.mockResolvedValue({ userId: ownerId, sessionVersion: 1 });
  db = setup(); mocks.create.mockReturnValue(db);
});
describe('owner-only management uses real authorization with mocked infrastructure', () => {
  it('grants capabilities only after getUserById confirms signed UUID identity', async () => {
    expect((await requireAdmin(req(), 'manage_admins')).permissions).toContain('manage_admins');
    expect(db.auth.admin.getUserById).toHaveBeenCalledWith(ownerId);
    expect(db.query.eq).toHaveBeenCalledWith('session_version', 1);
    expect(db.query.eq).toHaveBeenCalledWith('active', true);
  });
  it.each(['other@example.test', 'VICTOR.RIVERA@OTHER.test'])('denies other SUPER_ADMIN on every endpoint (%s)', async (other) => {
    ownerEmail = other;
    for (const response of [await GET(req()), await POST(req('POST', { email, role: 'SUPER_ADMIN' })), await PATCH(req('PATCH', { active: false }), ctx()), await DELETE(req('DELETE'), ctx()), await reset(req('POST'), ctx())]) expect(response.status).toBe(403);
    expect(db.rpc).not.toHaveBeenCalled();
    expect(db.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect((await requireAdmin(req(), 'view_dashboard')).permissions).not.toContain('manage_admins');
  });
  it('rejects unconfirmed identity, revoked session and non-super role', async () => {
    confirmed = false; expect((await GET(req())).status).toBe(403);
    confirmed = true; actor.role = 'ADMIN'; expect((await GET(req())).status).toBe(403);
    actor.role = 'SUPER_ADMIN'; mocks.session.mockResolvedValue(null); expect((await GET(req())).status).toBe(401);
  });
  it('fails closed on whitelist revocation and identity outage', async () => {
    db.query.single.mockResolvedValueOnce({ data: null as unknown as Record<string, unknown>, error: null });
    expect((await GET(req())).status).toBe(401);
    identityFailure = true; expect((await GET(req())).status).toBe(503);
  });
  it('derives reset capability by UUID and active target', async () => {
    expect((await (await GET(req())).json()).admins[0].can_reset_password).toBe(true);
    target!.user_id = ownerId;
    expect((await (await GET(req())).json()).admins[0].can_reset_password).toBe(false);
  });
  it('invites with official API and atomic membership RPC; rejects password fields', async () => {
    const body = { email: 'new@example.test', full_name: 'New Admin', role: 'ADMIN' };
    expect((await POST(req('POST', { ...body, password: 'forbidden' }))).status).toBe(400);
    target = null; directory = [];
    expect((await POST(req('POST', body))).status).toBe(201);
    expect(db.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(body.email, { data: { full_name: body.full_name }, redirectTo: 'https://www.my3dpr.site/es/account/recovery' });
    expect(db.rpc).toHaveBeenCalledWith('admin_grant_access', expect.objectContaining({ p_actor_user_id: ownerId, p_target_user_id: targetId }));
  });
  it('updates through atomic RPC and rejects password changes', async () => {
    expect((await PATCH(req('PATCH', { role: 'ADMIN' }), ctx())).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith('admin_update_access', expect.objectContaining({ p_actor_user_id: ownerId }));
    expect((await PATCH(req('PATCH', { password: 'forbidden' }), ctx())).status).toBe(400);
  });
  it('sends recovery to verified target email, ignoring caller email/redirect', async () => {
    expect((await reset(req('POST', { email: 'attacker@example.test', redirectTo: 'https://evil.test' }), ctx())).status).toBe(200);
    expect(db.auth.resetPasswordForEmail).toHaveBeenCalledWith('admin@example.test', { redirectTo: 'https://www.my3dpr.site/es/account/recovery' });
    expect(db.query.insert).toHaveBeenCalledWith(expect.objectContaining({ action: 'ADMIN_PASSWORD_RESET_SENT', metadata: {} }));
  });
  it.each(['missing', 'inactive', 'unbound', 'self', 'mismatch', 'malformed'])('rejects invalid reset target: %s', async (kind) => {
    if (kind === 'missing') target = null;
    if (kind === 'inactive') target!.active = false;
    if (kind === 'unbound') target!.user_id = null;
    if (kind === 'self') target!.user_id = ownerId;
    if (kind === 'mismatch') target!.email = 'different@example.test';
    expect((await reset(req('POST'), ctx(kind === 'malformed' ? 'bad-id' : targetId))).status).toBe(400);
    expect(db.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it('reports provider failure without leaking provider errors', async () => {
    db.auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 500 } });
    const response = await reset(req('POST'), ctx()); expect(response.status).toBe(502);
    expect(db.query.insert).toHaveBeenCalledWith(expect.objectContaining({ action: 'ADMIN_PASSWORD_RESET_FAILED' }));
  });
  it('blocks rate limits, audit outages, and cross-origin requests before email', async () => {
    db.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect((await reset(req('POST'), ctx())).status).toBe(429);
    db.query.insert.mockRejectedValueOnce(new Error('audit unavailable'));
    expect((await reset(req('POST'), ctx())).status).toBe(500);
    const evil = new NextRequest('https://www.my3dpr.site/api/admin/users', { method: 'POST', headers: { origin: 'https://evil.test' } });
    expect((await reset(evil, ctx())).status).toBe(403);
    expect(db.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});
