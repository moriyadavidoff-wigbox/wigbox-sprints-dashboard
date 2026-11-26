// Returns the active sprint's items, only to a signed-in user of the allowed domain.
import { currentUser } from './_lib/session.js';
import { loadSprint } from '../lib/zoho.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: 'login' });
    return;
  }
  try {
    const data = await loadSprint();
    res.status(200).json({ user: { email: user.email, name: user.name }, ...data });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: 'zoho', message: String((e && e.message) || e) });
  }
}
