// Pulls the active sprint from Zoho Sprints and writes data/sprint.json.
// Run by .github/workflows/update-data.yml; needs ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET and ZOHO_REFRESH_TOKEN.
import { writeFileSync, mkdirSync } from 'node:fs';
import { loadSprint } from '../lib/zoho.js';

for (const name of ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN']) {
  if (!process.env[name]) {
    console.error(`Missing ${name}. Add it under Settings > Secrets and variables > Actions.`);
    process.exit(1);
  }
}

const data = await loadSprint();
if (!data.items.length) {
  console.error('Zoho returned no items; keeping the previous data file.');
  process.exit(1);
}
mkdirSync('data', { recursive: true });
writeFileSync('data/sprint.json', JSON.stringify(data));
console.log(`Wrote ${data.items.length} items of "${data.sprint.name}"${data.truncated ? ' (truncated)' : ''}`);
