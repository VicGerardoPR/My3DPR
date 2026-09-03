import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const route = readFileSync(resolve(process.cwd(), 'src/app/api/admin/products/route.ts'), 'utf8');

describe('admin product creation compensation', () => {
  it('cleans an uploaded image before returning a duplicate SKU/slug conflict', () => {
    expect(route).toContain("if (error?.code === '23505') throw new ProductConflictError");
    expect(route).not.toContain("if (error?.code === '23505') return NextResponse.json");
    const postStart = route.indexOf('export async function POST');
    const catchStart = route.indexOf('} catch (error) {', postStart);
    const cleanup = route.indexOf("storageDb.storage.from('product-images').remove", catchStart);
    const conflictResponse = route.indexOf('error instanceof ProductConflictError', catchStart);
    expect(postStart).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(postStart);
    expect(cleanup).toBeGreaterThan(catchStart);
    expect(conflictResponse).toBeGreaterThan(cleanup);
  });
});
