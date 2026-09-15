import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const createRoute = readFileSync(resolve(process.cwd(), 'src/app/api/admin/products/route.ts'), 'utf8');
const imageRoute = readFileSync(resolve(process.cwd(), 'src/app/api/admin/products/[id]/images/route.ts'), 'utf8');
const dashboard = readFileSync(resolve(process.cwd(), 'src/components/admin/AdminDashboard.tsx'), 'utf8');

describe('admin product creation compensation', () => {
  it('cleans an uploaded image before returning a duplicate SKU/slug conflict', () => {
    expect(createRoute).toContain("if (error?.code === '23505') throw new ProductConflictError");
    expect(createRoute).not.toContain("if (error?.code === '23505') return NextResponse.json");
    const postStart = createRoute.indexOf('export async function POST');
    const catchStart = createRoute.indexOf('} catch (error) {', postStart);
    const cleanup = createRoute.indexOf("storageDb.storage.from('product-images').remove", catchStart);
    const conflictResponse = createRoute.indexOf('error instanceof ProductConflictError', catchStart);
    expect(postStart).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(postStart);
    expect(cleanup).toBeGreaterThan(catchStart);
    expect(conflictResponse).toBeGreaterThan(cleanup);
  });

  it('supports managed product image galleries with cleanup, primary selection, and max-count guard', () => {
    expect(imageRoute).toContain('MAX_IMAGES_PER_PRODUCT = 8');
    expect(imageRoute).toContain("form.getAll('images')");
    expect(imageRoute).toContain("db.storage.from('product-images').upload");
    expect(imageRoute).toContain("await db.storage.from('product-images').remove(paths)");
    expect(imageRoute).toContain('isExactPermutation');
    expect(imageRoute).toContain('El orden debe incluir cada imagen del producto exactamente una vez.');
    expect(imageRoute.indexOf("db.from('product_images').delete()")).toBeLessThan(imageRoute.indexOf("db.storage.from('product-images').remove([storagePath])"));
    expect(imageRoute).toContain('PRODUCT_IMAGES_ADDED');
    expect(imageRoute).toContain('PRODUCT_IMAGES_UPDATED');
    expect(imageRoute).toContain('PRODUCT_IMAGE_DELETED');
    expect(imageRoute).toContain('primary_image_id');
    expect(imageRoute).toContain('El producto debe conservar al menos una imagen.');
  });

  it('exposes image upload, primary image, reorder, and delete controls in the admin editor', () => {
    expect(dashboard).toContain('id="product-images-upload-form"');
    expect(dashboard).toContain('multiple className={inputClass}');
    expect(dashboard).toContain('Hacer principal');
    expect(dashboard).toContain('Mover imagen arriba');
    expect(dashboard).toContain('Mover imagen abajo');
    expect(dashboard).toContain('deleteImage(image.id)');
  });
});
