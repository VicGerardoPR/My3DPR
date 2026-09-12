// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Footer } from './layout/Footer';
import { AdminDashboard } from './admin/AdminDashboard';
import { dictionaries } from '@/lib/i18n';

vi.mock('next/navigation', () => ({ useRouter: () => router }));
const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock('next/image', () => ({ default: () => null }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('commercially accurate storefront', () => {
  it.each(['es', 'en'] as const)('does not advertise unconfigured services in %s', (lang) => {
    vi.stubEnv('NEXT_PUBLIC_BUSINESS_EMAIL', '');
    const { container } = render(<Footer lang={lang} />);
    expect(container.textContent).not.toMatch(/paypal|stripe|newsletter|100%|weekly|cada semana|USPS|garantía|guarantee/i);
    expect(container.querySelector('form[action="/api/newsletter"]')).toBeNull();
    expect(screen.getByRole('link', { name: 'victor.rivera@arcanointelligence.com' }).getAttribute('href')).toBe('mailto:victor.rivera@arcanointelligence.com');
    expect(container.querySelector('a[href="https://facebook.com"]')).toBeNull();
    expect(screen.getByRole('link', { name: /Instagram/ })).toBeTruthy();
    expect(dictionaries[lang].sections.customBannerSubtitle).not.toMatch(/24h/);
    expect(dictionaries[lang].features.qualityDesc).not.toMatch(/non-toxic|no tóxicos/);
  });
  it('preserves an explicitly configured public business address', () => {
    vi.stubEnv('NEXT_PUBLIC_BUSINESS_EMAIL', 'contact@example.org');
    render(<Footer lang="en" />);
    expect(screen.getByRole('link', { name: 'contact@example.org' }).getAttribute('href')).toBe('mailto:contact@example.org');
  });
});

const product = { id: 'product-1', name_es: 'Pieza', name_en: 'Piece', price: 10, cost_price: 4, material: 'PLA', status: 'AVAILABLE', is_featured: false, sku: 'TEST-1', variants: [{ stock_quantity: 5, color: 'Azul', size: 'M' }] };
function mockAdmin() {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => ({ ok: true, json: async () => {
    if (url === '/api/admin/me') return { admin: { id: 'self', fullName: 'Admin', role: 'SUPER_ADMIN', permissions: ['manage_products', 'manage_admins'] } };
    if (url === '/api/admin/kpis') return {};
    if (url === '/api/admin/users') return { admins: [{ id: 'a', full_name: 'Same name', email: 'a@example.org', role: 'ADMIN', active: true }, { id: 'b', full_name: 'Same name', email: 'b@example.org', role: 'ADMIN', active: true }] };
    if (init?.method === 'PATCH') return { product: { ...product, ...JSON.parse(String(init.body)) } };
    return { products: [product] };
  } })));
}

describe('stable admin form targets', () => {
  it('edits price and cost independently using named controls', async () => {
    mockAdmin(); render(<AdminDashboard lang="es" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Productos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Pieza' }));
    const form = screen.getByRole('form', { name: 'Editar producto' });
    const price = within(form).getByLabelText('Precio');
    const cost = within(form).getByLabelText('Costo');
    expect(price.getAttribute('name')).toBe('price');
    expect(cost.getAttribute('name')).toBe('cost_price');
    const controls = [...form.querySelectorAll('input, textarea, select')];
    const ids = controls.map(control => control.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    fireEvent.change(price, { target: { value: '12' } });
    fireEvent.change(cost, { target: { value: '6' } });
    fireEvent.submit(form);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/admin/products/product-1', expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('"price":12,"cost_price":6') })));
  });
  it('provides distinct role names and ids even for repeated team names', async () => {
    mockAdmin(); render(<AdminDashboard lang="es" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Administradores' }));
    const first = screen.getByRole('combobox', { name: 'Rol de a@example.org' });
    const second = screen.getByRole('combobox', { name: 'Rol de b@example.org' });
    expect(first.id).toBe('admin-role-a');
    expect(second.id).toBe('admin-role-b');
  });
});
