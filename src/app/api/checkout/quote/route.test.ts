import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  paymentDatabase: vi.fn(),
  consumeCheckoutRateLimit: vi.fn(),
}));

vi.mock('@/lib/payment-db', () => ({
  paymentDatabase: mocks.paymentDatabase,
  consumeCheckoutRateLimit: mocks.consumeCheckoutRateLimit,
}));

import { POST } from './route';

const request = (body: unknown) => new NextRequest('http://localhost/api/checkout/quote', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

describe('checkout quote route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.paymentDatabase.mockReturnValue({ rpc: mocks.rpc });
    mocks.consumeCheckoutRateLimit.mockResolvedValue(true);
  });

  it('returns the authoritative server totals without creating an order', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ subtotal: '25.00', shipping_cost: '4.99', tax_amount: '0.00', total_amount: '29.99', currency: 'USD' }],
      error: null,
    });

    const response = await POST(request({ lines: [{ productId: 'product-1', variantId: 'variant-1', quantity: 1 }] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      quote: { subtotal: 25, shippingCost: 4.99, tax: 0, total: 29.99, currency: 'USD' },
    });
    expect(mocks.rpc).toHaveBeenCalledWith('quote_order_totals', {
      p_lines: [{ product_id: 'product-1', variant_id: 'variant-1', quantity: 1, custom_text: null, custom_notes: null }],
    });
  });

  it('rejects an empty cart before querying the database', async () => {
    const response = await POST(request({ lines: [] }));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('returns a safe error if the quote RPC is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'internal function detail' } });
    const response = await POST(request({ lines: [{ productId: 'product-1', variantId: 'variant-1', quantity: 1 }] }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: 'No fue posible calcular el total.' });
  });

  it('blocks a quote when its IP rate limit is exhausted', async () => {
    mocks.consumeCheckoutRateLimit.mockResolvedValue(false);
    const response = await POST(request({ lines: [{ productId: 'product-1', variantId: 'variant-1', quantity: 1 }] }));
    expect(response.status).toBe(429);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
