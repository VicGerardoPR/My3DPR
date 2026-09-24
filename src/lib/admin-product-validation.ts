import { z } from 'zod';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const skuPattern = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;

const productSchema = z.object({
  name_es: z.string().trim().min(1).max(160),
  name_en: z.string().trim().max(160).optional().default(''),
  slug: z.string().trim().default(''),
  sku: z.string().trim().toUpperCase().default(''),
  description_es: z.string().trim().min(1, 'Escribe la descripción del producto.').max(5000),
  description_en: z.string().trim().max(5000).optional().default(''),
  price: z.coerce.number().positive('El precio debe ser mayor que cero.').max(1_000_000),
  cost_price: z.union([z.coerce.number().nonnegative().max(1_000_000), z.literal('')]).optional().catch(''),
  stock: z.coerce.number().int().min(0).max(1_000_000).catch(0),
  material: z.string().trim().min(1).max(80).catch('PLA'),
  color: z.string().trim().min(1).max(100).catch('Estándar'),
  size: z.string().trim().min(1).max(100).catch('Estándar'),
  status: z.enum(['AVAILABLE', 'READY_TO_SHIP', 'MADE_TO_ORDER', 'LOW_STOCK', 'OUT_OF_STOCK', 'PRE_ORDER', 'COMING_SOON']).catch('AVAILABLE'),
  dimensions_cm: z.string().trim().max(100).optional().catch(undefined),
  weight_grams: z.coerce.number().int().min(0).max(1_000_000).catch(100),
  lead_time_days: z.coerce.number().int().min(0).max(365).catch(3),
});

export type ProductPayload = z.infer<typeof productSchema>;

export function parseProductPayload(input: Record<string, unknown>) {
  const description = typeof input.description_es === 'string' ? input.description_es.trim() : '';
  const suppliedName = typeof input.name_es === 'string' ? input.name_es.trim() : '';
  const suppliedSlug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : '';
  const suppliedSku = typeof input.sku === 'string' ? input.sku.trim().toUpperCase() : '';

  return productSchema.safeParse({
    ...input,
    name_es: suppliedName || description.slice(0, 160),
    stock: input.stock === '' ? '0' : input.stock,
    weight_grams: input.weight_grams === '' || input.weight_grams === undefined ? 100 : input.weight_grams,
    lead_time_days: input.lead_time_days === '' || input.lead_time_days === undefined ? 3 : input.lead_time_days,
    slug: slugPattern.test(suppliedSlug) ? suppliedSlug : '',
    sku: skuPattern.test(suppliedSku) ? suppliedSku : '',
  });
}
