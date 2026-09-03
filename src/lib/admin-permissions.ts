export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'QUOTE_MANAGER'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
export type AdminPermission = 'view_dashboard' | 'manage_products' | 'manage_quotes' | 'manage_admins';

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  SUPER_ADMIN: ['view_dashboard', 'manage_products', 'manage_quotes', 'manage_admins'],
  ADMIN: ['view_dashboard', 'manage_products', 'manage_quotes'],
  CATALOG_MANAGER: ['view_dashboard', 'manage_products'],
  QUOTE_MANAGER: ['view_dashboard', 'manage_quotes'],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && (ADMIN_ROLES as readonly string[]).includes(value);
}

export function canAdmin(role: AdminRole, permission: AdminPermission): boolean {
  if (!isAdminRole(role)) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(role: AdminRole): AdminPermission[] {
  if (!isAdminRole(role)) return [];
  return [...ROLE_PERMISSIONS[role]];
}
