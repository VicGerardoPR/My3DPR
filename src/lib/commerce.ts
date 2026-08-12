import { z } from 'zod';

export const cartLineSchema = z.object({
  productId: z.string().min(1).max(100),
  variantId: z.string().min(1).max(100).optional(),
  quantity: z.number().int().min(1).max(25),
  customText: z.string().trim().max(80).optional(),
  customNotes: z.string().trim().max(500).optional(),
  bundleId: z.string().min(1).max(100).optional(),
  clientPrice: z.number().optional(),
});

export type CartLineInput = z.infer<typeof cartLineSchema>;

type CatalogProduct = { id: string; active: boolean; price: number; salePrice?: number | null; customizable?: boolean };
type CatalogVariant = { id: string; productId: string; active: boolean; price?: number | null; salePrice?: number | null; stock: number };

export class CommerceError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = 'CommerceError';
  }
}

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const lineKey = (line: CartLineInput) => [line.productId, line.variantId || '', line.customText?.trim() || '', line.customNotes?.trim() || '', line.bundleId || ''].join(':');

export function normalizeCartLines(input: unknown): CartLineInput[] {
  const parsed = z.array(cartLineSchema).min(1).max(100).parse(input);
  const merged = new Map<string, CartLineInput>();
  for (const line of parsed) {
    const key = lineKey(line);
    const current = merged.get(key);
    const quantity = (current?.quantity || 0) + line.quantity;
    if (quantity > 25) throw new CommerceError('INVALID_QUANTITY', 'La cantidad máxima por línea es 25.');
    merged.set(key, { ...line, customText: line.customText?.trim(), customNotes: line.customNotes?.trim(), quantity });
  }
  return [...merged.values()];
}

export function calculateOrder(input: {
  lines: unknown;
  destination: { country: string; state: string; postalCode: string };
  catalog: { products: CatalogProduct[]; variants: CatalogVariant[] };
  taxRate: number;
  shippingFee: number;
  freeShippingThreshold: number;
}) {
  const lines = normalizeCartLines(input.lines);
  const pricedLines = lines.map((line) => {
    const product = input.catalog.products.find((item) => item.id === line.productId && item.active);
    if (!product) throw new CommerceError('PRODUCT_UNAVAILABLE', 'Uno de los productos no está disponible.', 409);
    const variant = line.variantId
      ? input.catalog.variants.find((item) => item.id === line.variantId && item.active)
      : undefined;
    if (line.variantId && (!variant || variant.productId !== product.id)) {
      throw new CommerceError('INVALID_VARIANT', 'La variante seleccionada no pertenece al producto.', 409);
    }
    if (variant && line.quantity > variant.stock) {
      throw new CommerceError('OUT_OF_STOCK', 'No hay stock suficiente para la variante seleccionada.', 409);
    }
    if (line.customText && !product.customizable) {
      throw new CommerceError('CUSTOMIZATION_NOT_ALLOWED', 'Este producto no permite personalización.');
    }
    const unitPrice = money(variant?.salePrice ?? variant?.price ?? product.salePrice ?? product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new CommerceError('INVALID_CATALOG_PRICE', 'El producto tiene un precio inválido.', 500);
    return { ...line, unitPrice, lineTotal: money(unitPrice * line.quantity) };
  });
  const country = input.destination.country.toUpperCase();
  const state = input.destination.state.toUpperCase();
  if (country !== 'US' || !/^[0-9]{5}(?:-[0-9]{4})?$/.test(input.destination.postalCode)) {
    throw new CommerceError('INVALID_DESTINATION', 'Solo se aceptan direcciones válidas de Puerto Rico y Estados Unidos.');
  }
  if (!/^[A-Z]{2}$/.test(state)) throw new CommerceError('INVALID_STATE', 'Estado o territorio inválido.');
  const subtotal = money(pricedLines.reduce((sum, line) => sum + line.lineTotal, 0));
  const discount = 0;
  const discountedSubtotal = money(subtotal - discount);
  const shipping = discountedSubtotal >= input.freeShippingThreshold ? 0 : money(input.shippingFee);
  const tax = money(discountedSubtotal * input.taxRate);
  return { lines: pricedLines, subtotal, discount, shipping, tax, total: money(discountedSubtotal + shipping + tax) };
}
