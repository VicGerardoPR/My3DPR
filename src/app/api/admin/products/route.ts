import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminErrorResponse, getAdminDatabase, requireAdmin } from '@/lib/admin-auth';

const productSchema = z.object({
  name_es: z.string().trim().min(2).max(160),
  name_en: z.string().trim().min(2).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{2,63}$/),
  description_es: z.string().trim().max(5000).default(''),
  description_en: z.string().trim().max(5000).default(''),
  price: z.coerce.number().positive().max(1_000_000),
  cost_price: z.union([z.coerce.number().nonnegative().max(1_000_000), z.literal('')]).optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  material: z.string().trim().min(1).max(80).default('PLA'),
  color: z.string().trim().min(1).max(100).default('Estándar'),
  size: z.string().trim().min(1).max(100).default('Estándar'),
  status: z.enum(['AVAILABLE', 'READY_TO_SHIP', 'MADE_TO_ORDER', 'LOW_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'COMING_SOON']).default('AVAILABLE'),
  dimensions_cm: z.string().trim().max(100).optional(),
  weight_grams: z.coerce.number().int().min(0).max(1_000_000).default(100),
  lead_time_days: z.coerce.number().int().min(0).max(365).default(3),
});

class ProductConflictError extends Error {}

function formValues(form: FormData) {
  return Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === 'string'));
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, 'manage_products');
    const db = getAdminDatabase();
    const { data, error } = await db.from('products')
      .select('*, images:product_images(*), variants:product_variants(*)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Could not list products: ${error.code}`);
    return NextResponse.json({ products: data || [] });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  let imagePath: string | null = null;
  let storageDb: ReturnType<typeof getAdminDatabase> | null = null;
  try {
    const admin = await requireAdmin(request, 'manage_products');
    const form = await request.formData();
    const parsed = productSchema.safeParse(formValues(form));
    if (!parsed.success) return NextResponse.json({ error: 'Revisa los campos del producto.', issues: parsed.error.flatten().fieldErrors }, { status: 400 });

    const image = form.get('image');
    if (!(image instanceof File) || image.size === 0) return NextResponse.json({ error: 'Selecciona una imagen del producto.' }, { status: 400 });
    if (image.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(image.type)) {
      return NextResponse.json({ error: 'La imagen debe ser PNG, JPG o WebP y pesar menos de 5 MB.' }, { status: 400 });
    }

    const db = getAdminDatabase();
    storageDb = db;
    const value = parsed.data;
    const extension = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg';
    imagePath = `${value.slug}/${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await image.arrayBuffer());
    const { error: uploadError } = await db.storage.from('product-images').upload(imagePath, bytes, { contentType: image.type, cacheControl: '31536000' });
    if (uploadError) throw new Error(`Could not upload product image: ${uploadError.message}`);
    const imageUrl = db.storage.from('product-images').getPublicUrl(imagePath).data.publicUrl;

    const { data, error } = await db.rpc('admin_create_product', {
      p_actor_user_id: admin.userId, p_name_es: value.name_es, p_name_en: value.name_en,
      p_slug: value.slug, p_sku: value.sku, p_description_es: value.description_es,
      p_description_en: value.description_en, p_price: value.price,
      p_cost_price: value.cost_price === '' ? null : value.cost_price, p_status: value.status,
      p_material: value.material, p_weight_grams: value.weight_grams,
      p_dimensions_cm: value.dimensions_cm || null, p_lead_time_days: value.lead_time_days,
      p_is_featured: form.get('is_featured') === 'true', p_stock: value.stock,
      p_color: value.color, p_size: value.size, p_image_url: imageUrl,
    });
    if (error || !data) {
      if (error?.code === '23505') throw new ProductConflictError('Duplicate product SKU or slug.');
      throw new Error(`Could not create product transaction: ${error?.code || 'missing'}`);
    }
    imagePath = null;
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    if (imagePath && storageDb) {
      const { error: cleanupError } = await storageDb.storage.from('product-images').remove([imagePath]);
      if (cleanupError) console.error(JSON.stringify({ area: 'admin-product-storage-cleanup', code: cleanupError.name }));
    }
    if (error instanceof ProductConflictError) return NextResponse.json({ error: 'Ya existe un producto con ese SKU o slug.' }, { status: 409 });
    return adminErrorResponse(error);
  }
}
