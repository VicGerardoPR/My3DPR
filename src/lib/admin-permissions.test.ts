import { describe, expect, it } from 'vitest';
import { canAdmin, type AdminPermission, type AdminRole } from './admin-permissions';

const permissions: AdminPermission[] = ['view_dashboard', 'manage_products', 'manage_quotes', 'manage_admins'];

describe('admin role permissions', () => {
  it('gives SuperAdmin every administrative permission', () => {
    for (const permission of permissions) expect(canAdmin('SUPER_ADMIN', permission)).toBe(true);
  });

  it('allows Admin to operate products and quotes but never manage admins', () => {
    expect(canAdmin('ADMIN', 'view_dashboard')).toBe(true);
    expect(canAdmin('ADMIN', 'manage_products')).toBe(true);
    expect(canAdmin('ADMIN', 'manage_quotes')).toBe(true);
    expect(canAdmin('ADMIN', 'manage_admins')).toBe(false);
  });

  it('keeps specialist roles least-privileged', () => {
    expect(canAdmin('CATALOG_MANAGER', 'manage_products')).toBe(true);
    expect(canAdmin('CATALOG_MANAGER', 'manage_quotes')).toBe(false);
    expect(canAdmin('CATALOG_MANAGER', 'manage_admins')).toBe(false);
    expect(canAdmin('QUOTE_MANAGER', 'manage_quotes')).toBe(true);
    expect(canAdmin('QUOTE_MANAGER', 'manage_products')).toBe(false);
    expect(canAdmin('QUOTE_MANAGER', 'manage_admins')).toBe(false);
  });

  it('fails closed for unknown roles', () => {
    expect(canAdmin('OWNER' as AdminRole, 'manage_admins')).toBe(false);
  });
});
