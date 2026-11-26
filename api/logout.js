import { cookie } from './_lib/session.js';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', cookie('wsd_session', '', 0));
  res.redirect(302, '/');
}
