import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260815100000_admin_control_plane.sql');
const atomicMembershipPath = resolve(process.cwd(), 'supabase/migrations/20260815110000_atomic_admin_membership.sql');
const atomicCatalogPath = resolve(process.cwd(), 'supabase/migrations/20260815120000_atomic_admin_catalog_quotes.sql');

describe('admin control-plane migration', () => {
  it('supports least-privileged admin roles and preserves the current SuperAdmin', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    for (const role of ['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'QUOTE_MANAGER']) expect(sql).toContain(`'${role}'`);
    expect(sql).toContain('protect_last_super_admin');
    expect(sql).toContain("role = 'SUPER_ADMIN'");
    expect(sql).toContain('cannot remove the last active super admin');
    expect(sql).toContain('user_id uuid');
    expect(sql).toContain('REFERENCES auth.users(id)');
    expect(sql).toContain('session_version');
    expect(sql).toContain('active admin without a matching auth.users identity');
  });

  it('archives products instead of exposing removed products publicly', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('archived_at');
    expect(sql).toContain('products.archived_at IS NULL');
    expect(sql).toContain('p.archived_at IS NULL');
  });

  it('adds durable audit history and quote administration fields', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('admin_audit_log');
    expect(sql).toContain('admin_notes');
    expect(sql).toContain('updated_by_user_id');
  });

  it('mutates administrator access and its audit record atomically', () => {
    const sql = readFileSync(atomicMembershipPath, 'utf8');
    expect(sql).toContain('admin_grant_access');
    expect(sql).toContain('admin_update_access');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('target auth identity mismatch');
    expect(sql).toContain('cannot revoke or demote current super admin');
    expect(sql).toContain('INSERT INTO public.admin_audit_log');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.admin_grant_access');
    expect(sql).toContain('TO service_role');
  });

  it('mutates products, their single variant, quotes, and audit records atomically', () => {
    const sql = readFileSync(atomicCatalogPath, 'utf8');
    for (const fn of ['admin_create_product', 'admin_update_product', 'admin_update_quote']) expect(sql).toContain(fn);
    expect(sql).toContain('exactly one product variant is required');
    expect(sql.match(/INSERT INTO public\.admin_audit_log/g)?.length).toBeGreaterThanOrEqual(3);
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.admin_create_product');
    expect(sql).toContain('TO service_role');
  });
});
