import { describe, expect, it } from 'vitest';
import { parseProductPayload } from './admin-product-validation';

describe('admin product create validation', () => {
  it('accepts only price and description and supplies safe defaults', () => {
    const result = parseProductPayload({
      price: '24.50',
      description_es: 'Tortuga decorativa para escritorio',
      name_es: '',
      slug: 'tortuga azul',
      sku: 'x',
      stock: '',
      material: '',
      color: '',
      size: '',
      status: 'INVALID',
      weight_grams: 'invalid',
      lead_time_days: '',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.name_es).toBe('Tortuga decorativa para escritorio');
    expect(result.data.slug).toBe('');
    expect(result.data.sku).toBe('');
    expect(result.data.stock).toBe(0);
    expect(result.data.material).toBe('PLA');
    expect(result.data.status).toBe('AVAILABLE');
    expect(result.data.weight_grams).toBe(100);
    expect(result.data.lead_time_days).toBe(3);
  });

  it('still requires a positive price and a description', () => {
    expect(parseProductPayload({ price: '', description_es: 'Algo' }).success).toBe(false);
    expect(parseProductPayload({ price: '20', description_es: '' }).success).toBe(false);
  });
});
