const encoder = new TextEncoder();
const decoder = new TextDecoder();

type AdminSession = { email: string; role: string; exp: number };

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(payload))));
}

export async function createAdminSession(
  admin: { email: string; role: string },
  secret: string,
  lifetimeSeconds = 60 * 60 * 8,
) {
  if (secret.length < 8) throw new Error('ADMIN_SESSION_SECRET must contain at least 8 characters.');
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ ...admin, exp: Math.floor(Date.now() / 1000) + lifetimeSeconds })));
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifyAdminSession(token: string | undefined, secret: string): Promise<AdminSession | null> {
  if (!token || !secret) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = await sign(payload, secret);
  if (signature.length !== expected.length) return null;
  let difference = 0;
  for (let index = 0; index < signature.length; index += 1) difference |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  if (difference !== 0) return null;
  try {
    const session = JSON.parse(decoder.decode(base64UrlToBytes(payload))) as AdminSession;
    if (!session.email || !session.role || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}
