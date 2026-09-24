import { describe, expect, it } from 'vitest';
import { productImageStoragePaths } from './admin-product-deletion';

describe('permanent product deletion', () => {
  it('extracts unique paths only for images stored in the product-images bucket', () => {
    expect(productImageStoragePaths([
      { url: 'https://shop.supabase.co/storage/v1/object/public/product-images/dragon/one.jpg' },
      { url: 'https://shop.supabase.co/storage/v1/object/public/product-images/dragon/one.jpg' },
      { url: 'https://shop.supabase.co/storage/v1/object/public/product-images/dragon/two%20blue.jpg' },
      { url: '/images/product-placeholder.svg' },
      { url: 'https://images.example.com/dragon.jpg' },
      { url: 'not a URL' },
    ])).toEqual(['dragon/one.jpg', 'dragon/two blue.jpg']);
  });

  it('keeps deletion separate from archiving and audits an authorized permanent delete', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const root = process.cwd();
    const route = readFileSync(resolve(root, 'src/app/api/admin/products/[id]/route.ts'), 'utf8');
    const dashboard = readFileSync(resolve(root, 'src/components/admin/AdminDashboard.tsx'), 'utf8');
    const migrations = readdirSync(resolve(root, 'supabase/migrations'));
    const deletionMigration = migrations
      .map((file) => readFileSync(resolve(root, 'supabase/migrations', file), 'utf8'))
      .find((content) => content.includes('FUNCTION public.admin_delete_product'));

    expect(route).toContain("requireAdmin(request, 'manage_products')");
    expect(route).toContain("rpc('admin_delete_product'");
    expect(route).toContain("storage.from('product-images').remove");
    expect(route).not.toContain('archiveRequest');
    expect(dashboard).toContain('deleteProduct(product)');
    expect(dashboard).toContain('Eliminar definitivamente');
    expect(dashboard).toContain('setProducts((current) => current.filter((item) => item.id !== product.id))');
    expect(deletionMigration).toContain("'PRODUCT_DELETED'");
    expect(deletionMigration).toContain('DELETE FROM public.products');
    expect(deletionMigration).toContain("v_actor.role NOT IN ('SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER')");
  });
});
