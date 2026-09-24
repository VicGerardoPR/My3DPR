import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminErrorResponse, getAdminDatabase, requireAdmin } from '@/lib/admin-auth';
import { productImageStoragePaths } from '@/lib/admin-product-deletion';

const updateSchema = z.object({
  name_es: z.string().trim().min(2).max(160).optional(),
  name_en: z.string().trim().min(2).max(160).optional(),
  description_es: z.string().trim().max(5000).optional(),
  description_en: z.string().trim().max(5000).optional(),
  price: z.number().positive().max(1_000_000).optional(),
  cost_price: z.number().nonnegative().max(1_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  material: z.string().trim().min(1).max(80).optional(),
  color: z.string().trim().min(1).max(100).optional(),
  size: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['AVAILABLE', 'READY_TO_SHIP', 'MADE_TO_ORDER', 'LOW_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'COMING_SOON']).optional(),
  dimensions_cm: z.string().trim().max(100).nullable().optional(),
  weight_grams: z.number().int().min(0).max(1_000_000).optional(),
  lead_time_days: z.number().int().min(0).max(365).optional(),
  is_featured: z.boolean().optional(),
  archived: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, 'No changes supplied');

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(request, 'manage_products');
    const { id } = await context.params;
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Revisa los cambios del producto.', issues: parsed.error.flatten().fieldErrors }, { status: 400 });

    const db = getAdminDatabase();
    const { data, error } = await db.rpc('admin_update_product', {
      p_actor_user_id: admin.userId,
      p_product_id: id,
      p_changes: parsed.data,
    });
    if (error || !data) {
      if (error?.message.includes('product not found')) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
      if (error?.message.includes('exactly one product variant is required')) return NextResponse.json({ error: 'Este editor solo admite productos con exactamente una variante.' }, { status: 409 });
      throw new Error(`Could not update product transaction: ${error?.code || 'missing'}`);
    }
    return NextResponse.json({ product: data });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin(request, 'manage_products');
    const { id } = await context.params;
    const db = getAdminDatabase();
    const { data, error } = await db.rpc('admin_delete_product', {
      p_actor_user_id: admin.userId,
      p_product_id: id,
    });
    if (error || !data) {
      if (error?.message.includes('product not found')) return NextResponse.json({ error: 'Producto no encontrado.' }, { status: 404 });
      throw new Error(`Could not delete product: ${error?.code || 'missing'}`);
    }

    const storagePaths = productImageStoragePaths(data.images);
    let storageCleanupWarning = false;
    if (storagePaths.length > 0) {
      const { error: cleanupError } = await db.storage.from('product-images').remove(storagePaths);
      if (cleanupError) {
        storageCleanupWarning = true;
        console.error(JSON.stringify({ area: 'admin-product-storage-delete', code: cleanupError.name }));
      }
    }
    return NextResponse.json({ deleted: true, productId: id, storageCleanupWarning });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
