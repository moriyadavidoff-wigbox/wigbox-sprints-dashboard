// Signed session cookies and small request helpers. No dependencies.
import crypto from 'node:crypto';

export const DOMAIN = () => (process.env.ALLOWED_DOMAIN || 'wigbox.co.il').trim().toLowerCase();

function secret() {
  const s = process.env.SESSION_SECRET || '';
  if (s.length < 32) throw new Error('SESSION_SECRET is missing or shorter than 32 characters');
  return s;
}

const mac = (body) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

export function sign(obj) {
  const body = Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
  return body + '.' + mac(body);
}

export function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(mac(body));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const obj = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!obj || typeof obj.exp !== 'number' || obj.exp < Date.now()) return null;
    return obj;
  } catch {
    return null;
  }
}

export function readCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch { /* ignore bad cookie */ }
    }
  }
  return out;
}

export function cookie(name, value, maxAgeSeconds) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

// The redirect URI must also be registered in Google Cloud, so a spoofed host cannot complete a login.
export function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/+$/, '');
  return `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
}

export function currentUser(req) {
  const s = verify(readCookies(req).wsd_session);
  if (!s || !s.email || !String(s.email).endsWith('@' + DOMAIN())) return null;
  return s;
}
