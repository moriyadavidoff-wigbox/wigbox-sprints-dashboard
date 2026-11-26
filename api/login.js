// Sends the user to Google sign-in, limited to the company's Google Workspace domain.
import crypto from 'node:crypto';
import { cookie, baseUrl, DOMAIN } from './_lib/session.js';

export default function handler(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('GOOGLE_CLIENT_ID is not set');
    return;
  }
  const state = crypto.randomBytes(24).toString('base64url');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: baseUrl(req) + '/api/callback',
    response_type: 'code',
    scope: 'openid email profile',
    hd: DOMAIN(),
    state,
    prompt: 'select_account'
  });
  res.setHeader('Set-Cookie', cookie('wsd_state', state, 600));
  res.redirect(302, 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
}
