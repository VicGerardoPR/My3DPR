// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn(), accept: vi.fn(), save: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }));
vi.mock('@/lib/password-recovery', () => ({ acceptPasswordLink: mocks.accept, saveRecoveredPassword: mocks.save }));
import { PasswordRecovery } from './PasswordRecovery';
beforeEach(() => {
  vi.clearAllMocks(); process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-only';
  mocks.create.mockReturnValue({ auth: {} }); mocks.accept.mockResolvedValue(undefined); mocks.save.mockResolvedValue(undefined);
  window.history.replaceState(null, '', '/es/account/recovery?next=https://evil.test#type=recovery&access_token=mock&refresh_token=mock');
});
afterEach(cleanup);
it('clears link secrets and ignores redirects; uses isolated auth client and masked fields', async () => {
  render(<PasswordRecovery />);
  await screen.findByText('Guardar contraseña');
  expect(window.location.hash).toBe(''); expect(window.location.search).toBe('');
  expect(window.location.pathname).toBe('/es/account/recovery');
  expect(mocks.create).toHaveBeenCalledWith(expect.any(String), expect.any(String), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' } });
  expect(screen.getByLabelText('Nueva contraseña').getAttribute('type')).toBe('password');
  const password = 'mock-only-not-a-real-password';
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: password } });
  fireEvent.submit(screen.getByText('Guardar contraseña').closest('form')!);
  await screen.findByText('Contraseña guardada. Inicia sesión con tu nueva contraseña.');
  expect(screen.queryByLabelText('Nueva contraseña')).toBeNull();
});
it('shows invalid link without enabling a password form', async () => {
  mocks.accept.mockRejectedValue(new Error('expired'));
  render(<PasswordRecovery />);
  await screen.findByText('Enlace inválido o expirado. Solicita uno nuevo al propietario.');
  expect(screen.queryByLabelText('Nueva contraseña')).toBeNull();
});
it('keeps update failure visible without claiming success', async () => {
  mocks.save.mockRejectedValue(new Error('failed'));
  render(<PasswordRecovery />); await screen.findByText('Guardar contraseña');
  fireEvent.submit(screen.getByText('Guardar contraseña').closest('form')!);
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('No se pudo completar'));
  expect(screen.queryByText('Contraseña guardada. Inicia sesión con tu nueva contraseña.')).toBeNull();
});
