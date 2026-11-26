// Google redirects here after sign-in. The code is exchanged server-side and only
// verified accounts of the allowed Workspace domain get a session cookie.
import { cookie, readCookies, baseUrl, sign, DOMAIN } from './_lib/session.js';

const SESSION_DAYS = 7;

function page(message) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>כניסה לדשבורד</title></head>
<body style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:40px 20px;max-width:560px;margin:auto;line-height:1.6">
<p>${message}</p><p><a href="/api/login">לנסות שוב</a></p></body></html>`;
}

export default async function handler(req, res) {
  const fail = (message) => {
    res.setHeader('Set-Cookie', cookie('wsd_state', '', 0));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(403).send(page(message));
  };

  const { code, state, error } = req.query || {};
  if (error) return fail('ההתחברות בוטלה.');
  const saved = readCookies(req).wsd_state;
  if (!code || !state || !saved || saved !== state) return fail('ההתחברות לא הושלמה. נסי שוב.');

  let tokens = {};
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: baseUrl(req) + '/api/callback',
        grant_type: 'authorization_code'
      })
    });
    tokens = await r.json().catch(() => ({}));
    if (!r.ok || !tokens.id_token) return fail('Google לא אישר את ההתחברות.');
  } catch {
    return fail('לא הצלחנו להתחבר ל-Google.');
  }

  // The ID token came straight from Google's token endpoint over HTTPS, so its claims can be read without a signature check.
  let claims;
  try {
    claims = JSON.parse(Buffer.from(String(tokens.id_token).split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return fail('התקבלה תשובה לא תקינה מ-Google.');
  }

  const domain = DOMAIN();
  const email = String(claims.email || '').toLowerCase();
  const allowed =
    claims.aud === process.env.GOOGLE_CLIENT_ID &&
    (claims.iss === 'accounts.google.com' || claims.iss === 'https://accounts.google.com') &&
    claims.email_verified === true &&
    String(claims.hd || '').toLowerCase() === domain &&
    email.endsWith('@' + domain);
  if (!allowed) return fail(`הכניסה מותרת רק לחשבונות Google של ${domain}.`);

  const session = sign({ email, name: claims.name || email, exp: Date.now() + SESSION_DAYS * 86400000 });
  res.setHeader('Set-Cookie', [cookie('wsd_session', session, SESSION_DAYS * 86400), cookie('wsd_state', '', 0)]);
  res.redirect(302, '/');
}
