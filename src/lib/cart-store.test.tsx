import { describe, expect, it } from 'vitest';
import { normalizeCartLines } from './commerce';

describe('cart line identity', () => {
  it('combina la misma variante y personalización', () => {
    const lines = normalizeCartLines([
      { productId: 'p1', variantId: 'v1', quantity: 1, customText: 'ALEX' },
      { productId: 'p1', variantId: 'v1', quantity: 2, customText: ' ALEX ' },
    ]);
    expect(lines).toEqual([{ productId: 'p1', variantId: 'v1', quantity: 3, customText: 'ALEX', customNotes: undefined }]);
  });

  it('mantiene variantes y personalizaciones distintas en líneas separadas', () => {
    const lines = normalizeCartLines([
      { productId: 'p1', variantId: 'v1', quantity: 1, customText: 'ALEX' },
      { productId: 'p1', variantId: 'v2', quantity: 1, customText: 'ALEX' },
      { productId: 'p1', variantId: 'v1', quantity: 1, customText: 'MIA' },
    ]);
    expect(lines).toHaveLength(3);
  });
});
