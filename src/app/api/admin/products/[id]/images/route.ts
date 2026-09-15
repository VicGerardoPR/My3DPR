import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminErrorResponse, getAdminDatabase, requireAdmin, writeAdminAudit } from '@/lib/admin-auth';

const imageMutationSchema = z.object({
  primary_image_id: z.string().uuid().optional(),
  order: z.array(z.string().uuid()).optional(),
  image_id: z.string().uuid().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };
type AdminDatabase = ReturnType<typeof getAdminDatabase>;
type ProductImageRow = { id: string; product_id: string; url: string; alt_text: string | null; sort_order: number; is_primary: boolean; created_at?: string };

const MAX_IMAGES_PER_PRODUCT = 8;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

async function productResponse(db: AdminDatabase, productId: string) {
  const { data, error } = await db.from('products')
    .select('*, images:product_images(*), variants:product_variants(*)')
    .eq('id', productId)
    .single();
  if (error || !data) throw new Error(`Could not read product images: ${error?.code || 'missing'}`);
  return data;
}

function storagePathFromPublicUrl(url: string) {
  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/product-images/';
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

function imageFilesFromForm(form: FormData) {
  return [...form.getAll('images'), ...form.getAll('image')]
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function isExactPermutation(order: string[], existingIds: Set<string>) {
  return order.length === existingIds.size && new Set(order).size === order.length && order.every((imageId) => existingIds.has(imageId));
}

async function restoreImageRows(db: AdminDatabase, productId: string, images: ProductImageRow[]) {
  for (const image of images) {
    const { error } = await db.from('product_images')
      .update({ sort_order: image.sort_order, is_primary: image.is_primary })
      .eq('id', image.id)
      .eq('product_id', productId);
    if (error) console.error(JSON.stringify({ area: 'admin-product-image-rollback', code: error.code }));
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const uploadedPaths: string[] = [];
  const insertedRows: Array<ProductImageRow & { storage_path: string }> = [];
  let db: AdminDatabase | null = null;
  try {
    const admin = await requireAdmin(request, 'manage_products');
    const { id } = await context.params;
    db = getAdminDatabase();
    const product = await productResponse(db, id);
    const form = await request.formData();
    const files = imageFilesFromForm(form);
    if (files.length === 0) return NextResponse.json({ error: 'Selecciona al menos una imagen.' }, { status: 400 });
    const currentCount = product.images?.length || 0;
    if (currentCount + files.length > MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json({ error: `Cada producto admite hasta ${MAX_IMAGES_PER_PRODUCT} imágenes.` }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES || !ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json({ error: 'Cada imagen debe ser PNG, JPG o WebP y pesar menos de 5 MB.' }, { status: 400 });
      }
    }

    const startOrder = currentCount;
    for (const [index, file] of files.entries()) {
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const imagePath = `${product.slug}/${crypto.randomUUID()}.${extension}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: uploadError } = await db.storage.from('product-images').upload(imagePath, bytes, { contentType: file.type, cacheControl: '31536000' });
      if (uploadError) throw new Error(`Could not upload product image: ${uploadError.message}`);
      uploadedPaths.push(imagePath);
      const imageUrl = db.storage.from('product-images').getPublicUrl(imagePath).data.publicUrl;
      const { data: image, error: imageError } = await db.from('product_images').insert({
        product_id: id,
        url: imageUrl,
        alt_text: product.name_es,
        sort_order: startOrder + index,
        is_primary: currentCount === 0 && index === 0,
      }).select('*').single();
      if (imageError || !image) throw new Error(`Could not insert product image: ${imageError?.code || 'missing'}`);
      insertedRows.push({ ...(image as ProductImageRow), storage_path: imagePath });
      uploadedPaths.splice(uploadedPaths.indexOf(imagePath), 1);
    }

    await writeAdminAudit(db, admin, 'PRODUCT_IMAGES_ADDED', 'PRODUCT', id, { count: insertedRows.length });
    return NextResponse.json({ product: await productResponse(db, id) });
  } catch (error) {
    if (db) {
      if (insertedRows.length > 0) {
        await db.from('product_images').delete().in('id', insertedRows.map((image) => image.id));
      }
      const paths = [...uploadedPaths, ...insertedRows.map((image) => image.storage_path)];
      if (paths.length > 0) await db.storage.from('product-images').remove(paths);
    }
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let db: AdminDatabase | null = null;
  let productId: string | null = null;
  let originalImages: ProductImageRow[] = [];
  let shouldRollback = false;
  try {
    const admin = await requireAdmin(request, 'manage_products');
    const { id } = await context.params;
    productId = id;
    const parsed = imageMutationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || (!parsed.data.primary_image_id && !parsed.data.order)) {
      return NextResponse.json({ error: 'Revisa los cambios de imágenes.' }, { status: 400 });
    }
    db = getAdminDatabase();
    const product = await productResponse(db, id);
    originalImages = [...(product.images || [])] as ProductImageRow[];
    const existingIds = new Set(originalImages.map((image) => image.id));

    if (parsed.data.order) {
      if (!isExactPermutation(parsed.data.order, existingIds)) {
        return NextResponse.json({ error: 'El orden debe incluir cada imagen del producto exactamente una vez.' }, { status: 400 });
      }
      shouldRollback = true;
      for (const [sortOrder, imageId] of parsed.data.order.entries()) {
        const { error } = await db.from('product_images').update({ sort_order: sortOrder }).eq('id', imageId).eq('product_id', id);
        if (error) throw new Error(`Could not reorder product image: ${error.code}`);
      }
    }

    if (parsed.data.primary_image_id) {
      if (!existingIds.has(parsed.data.primary_image_id)) return NextResponse.json({ error: 'La imagen principal no pertenece a este producto.' }, { status: 400 });
      shouldRollback = true;
      const { error: clearError } = await db.from('product_images').update({ is_primary: false }).eq('product_id', id);
      if (clearError) throw new Error(`Could not clear primary product image: ${clearError.code}`);
      const { error: primaryError } = await db.from('product_images').update({ is_primary: true }).eq('product_id', id).eq('id', parsed.data.primary_image_id);
      if (primaryError) throw new Error(`Could not set primary product image: ${primaryError.code}`);
    }

    await writeAdminAudit(db, admin, 'PRODUCT_IMAGES_UPDATED', 'PRODUCT', id, { primary_image_id: parsed.data.primary_image_id || null, reordered: Boolean(parsed.data.order) });
    shouldRollback = false;
    return NextResponse.json({ product: await productResponse(db, id) });
  } catch (error) {
    if (shouldRollback && db && productId && originalImages.length > 0) await restoreImageRows(db, productId, originalImages);
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  let db: AdminDatabase | null = null;
  let productId: string | null = null;
  let originalImages: ProductImageRow[] = [];
  let deletedImage: ProductImageRow | null = null;
  let shouldRollback = false;
  try {
    const admin = await requireAdmin(request, 'manage_products');
    const { id } = await context.params;
    productId = id;
    const parsed = imageMutationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !parsed.data.image_id) return NextResponse.json({ error: 'Selecciona la imagen a eliminar.' }, { status: 400 });
    db = getAdminDatabase();
    const product = await productResponse(db, id);
    const images = ([...(product.images || [])] as ProductImageRow[]).sort((a, b) => a.sort_order - b.sort_order);
    originalImages = images;
    if (images.length <= 1) return NextResponse.json({ error: 'El producto debe conservar al menos una imagen.' }, { status: 400 });
    const image = images.find((item) => item.id === parsed.data.image_id);
    if (!image) return NextResponse.json({ error: 'Imagen no encontrada para este producto.' }, { status: 404 });
    deletedImage = image;
    shouldRollback = true;

    if (image.is_primary) {
      const replacement = images.find((item) => item.id !== image.id);
      if (replacement) {
        const { error: primaryError } = await db.from('product_images').update({ is_primary: true }).eq('id', replacement.id).eq('product_id', id);
        if (primaryError) throw new Error(`Could not replace primary product image: ${primaryError.code}`);
      }
    }
    const { error: deleteError } = await db.from('product_images').delete().eq('id', image.id).eq('product_id', id);
    if (deleteError) throw new Error(`Could not delete product image row: ${deleteError.code}`);

    await writeAdminAudit(db, admin, 'PRODUCT_IMAGE_DELETED', 'PRODUCT', id, { image_id: image.id });
    shouldRollback = false;

    const storagePath = storagePathFromPublicUrl(image.url);
    if (storagePath) {
      const { error: removeError } = await db.storage.from('product-images').remove([storagePath]);
      if (removeError) console.error(JSON.stringify({ area: 'admin-product-image-object-cleanup', code: removeError.name }));
    }
    return NextResponse.json({ product: await productResponse(db, id) });
  } catch (error) {
    if (shouldRollback && db && productId) {
      if (deletedImage) {
        const { error: restoreError } = await db.from('product_images').insert(deletedImage);
        if (restoreError && restoreError.code !== '23505') console.error(JSON.stringify({ area: 'admin-product-image-delete-rollback', code: restoreError.code }));
      }
      if (originalImages.length > 0) await restoreImageRows(db, productId, originalImages);
    }
    return adminErrorResponse(error);
  }
}
