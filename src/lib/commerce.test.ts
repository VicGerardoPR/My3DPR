import { describe, expect, it } from 'vitest';
import { calculateOrder, CommerceError, normalizeCartLines } from './commerce';

const catalog = {
  products: [{ id: 'p1', active: true, price: 20, salePrice: 15, customizable: true }],
  variants: [
    { id: 'v1', productId: 'p1', active: true, price: 18, salePrice: null, stock: 2 },
    { id: 'v2', productId: 'p1', active: true, price: 21, salePrice: 17, stock: 5 },
  ],
};

describe('server-authoritative commerce calculation', () => {
  it('ignores browser amounts and prices a selected variant from the catalog', () => {
    const result = calculateOrder({
      lines: [{ productId: 'p1', variantId: 'v1', quantity: 2, clientPrice: 0.01 }],
      destination: { country: 'US', state: 'PR', postalCode: '00901' },
      catalog,
      taxRate: 0,
      shippingFee: 4.99,
      freeShippingThreshold: 50,
    });
    expect(result.subtotal).toBe(36);
    expect(result.shipping).toBe(4.99);
    expect(result.total).toBe(40.99);
  });

  it('rejects a variant that does not belong to the product', () => {
    expect(() => calculateOrder({
      lines: [{ productId: 'other', variantId: 'v1', quantity: 1 }],
      destination: { country: 'US', state: 'PR', postalCode: '00901' },
      catalog,
      taxRate: 0,
      shippingFee: 4.99,
      freeShippingThreshold: 50,
    })).toThrowError(CommerceError);
  });

  it('rejects quantities above variant inventory', () => {
    expect(() => calculateOrder({
      lines: [{ productId: 'p1', variantId: 'v1', quantity: 3 }],
      destination: { country: 'US', state: 'PR', postalCode: '00901' },
      catalog,
      taxRate: 0,
      shippingFee: 4.99,
      freeShippingThreshold: 50,
    })).toThrow(/stock/i);
  });

  it('keeps variants and customizations as separate cart identities', () => {
    const lines = normalizeCartLines([
      { productId: 'p1', variantId: 'v1', quantity: 1, customText: 'ALEX' },
      { productId: 'p1', variantId: 'v2', quantity: 1, customText: 'ALEX' },
      { productId: 'p1', variantId: 'v1', quantity: 1, customText: 'MIA' },
    ]);
    expect(lines).toHaveLength(3);
  });

  it('uses post-discount subtotal as the single free-shipping threshold basis', () => {
    const result = calculateOrder({
      lines: [{ productId: 'p1', variantId: 'v2', quantity: 3 }],
      destination: { country: 'US', state: 'PR', postalCode: '00901' },
      catalog,
      taxRate: 0,
      shippingFee: 4.99,
      freeShippingThreshold: 50,
    });
    expect(result.subtotal).toBe(51);
    expect(result.shipping).toBe(0);
  });
});
