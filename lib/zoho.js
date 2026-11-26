// Reads the active sprint, its items and the project's epics from the Zoho Sprints API (read only).
// Settings come from environment variables; see README.md.

const ACCOUNTS = () => (process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com').replace(/\/+$/, '');
const API = () => (process.env.ZOHO_SPRINTS_API || 'https://sprintsapi.zoho.com/zsapi').replace(/\/+$/, '');
const TEAM = () => process.env.ZOHO_TEAM_ID || '940399514';
const PROJECT = () => process.env.ZOHO_PROJECT_ID || '200192000000021173';
const PAGE = 100;
const MAX_PAGES = 15;
const CACHE_MS = 5 * 60 * 1000;

let token = null;
let tokenExpires = 0;
let cache = null;
let cacheAt = 0;

async function accessToken() {
  if (token && Date.now() < tokenExpires - 60000) return token;
  const r = await fetch(ACCOUNTS() + '/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN || '',
      client_id: process.env.ZOHO_CLIENT_ID || '',
      client_secret: process.env.ZOHO_CLIENT_SECRET || '',
      grant_type: 'refresh_token'
    })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('Zoho token refresh failed: ' + (j.error || r.status));
  token = j.access_token;
  tokenExpires = Date.now() + (Number(j.expires_in) || 3600) * 1000;
  return token;
}

async function get(path, params) {
  const url = API() + path + '?' + new URLSearchParams(params).toString();
  const r = await fetch(url, {
    headers: {
      Authorization: 'Zoho-oauthtoken ' + (await accessToken()),
      'X-convert-response': 'true',
      'x-za-ui-version': 'v2'
    }
  });
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); } catch { throw new Error(`Zoho Sprints returned a non-JSON answer (${r.status}) for ${path}`); }
  // Some responses wrap the payload in {data: {...}}.
  const d = j && j.data && typeof j.data === 'object' && !Array.isArray(j.data) ? j.data : j;
  const status = d.status || j.status;
  if (!r.ok || (status && status !== 'success')) {
    throw new Error(`Zoho Sprints error ${r.status} for ${path}: ${j.message || d.message || j.code || text.slice(0, 200)}`);
  }
  return d;
}

const clean = (v) => (v && v !== '-1' ? v : null);

async function fetchSprint() {
  const d = await get(`/team/${TEAM()}/projects/${PROJECT()}/sprints/`, { action: 'data', index: 1, range: 10, type: '[2]' });
  const s = (d.sprints || [])[0];
  if (!s) throw new Error('No active sprint in the project');
  return { id: String(s.sprintId), name: s.sprintName, startDate: clean(s.startDate), endDate: clean(s.endDate) };
}

async function fetchItems(sprintId) {
  const users = {};
  const seen = new Set();
  const items = [];
  let index = 1;
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const d = await get(`/team/${TEAM()}/projects/${PROJECT()}/sprints/${sprintId}/item/`, {
      action: 'data', index, range: PAGE, subitem: true
    });
    Object.assign(users, d.userDisplayName || {});
    for (const it of d.items || []) {
      if (seen.has(it.itemId)) continue; // pages can overlap when sub-items spill over
      seen.add(it.itemId);
      items.push(it);
    }
    if (d.next !== true) break;
    index += PAGE;
    if (page === MAX_PAGES - 1) truncated = true;
  }
  return {
    truncated,
    items: items.map((it) => ({
      itemNo: String(it.itemNo),
      itemId: String(it.itemId),
      name: String(it.itemName || '').replace(/\s+/g, ' ').trim(),
      type: it.itemTypeName || '',
      status: it.statusName || '',
      owners: (it.ownerId || []).map((id) => users[id] || id),
      epicId: it.epicId ? String(it.epicId) : '',
      parentId: String(it.parentItem || it.immediateParentId || ''),
      dueDate: clean(it.endDate),
      overdue: it.isOverDue === true,
      completedDate: clean(it.completedDate)
    }))
  };
}

async function fetchEpics() {
  const d = await get(`/team/${TEAM()}/projects/${PROJECT()}/epic/`, { action: 'data', index: 1, range: 100 });
  const out = {};
  for (const e of d.epics || []) out[String(e.epicId)] = String(e.epicName || '').trim();
  return out;
}

export async function loadSprint() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const sprint = await fetchSprint();
  const [{ items, truncated }, epics] = await Promise.all([fetchItems(sprint.id), fetchEpics()]);
  cache = { generatedAt: new Date().toISOString(), sprint, epics, items, truncated };
  cacheAt = Date.now();
  return cache;
}
