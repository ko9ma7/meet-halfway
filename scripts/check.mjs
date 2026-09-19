import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const required = ['index.html','config.js','src/main.js','src/styles.css','src/lib/threeFx.js','public/favicon.svg','public/favicon.ico','public/og-image.png','public/site.webmanifest','public/404.html','supabase/schema.sql','.github/workflows/deploy.yml','github-bootstrap.cmd','scripts/github-bootstrap.ps1','scripts/public-defaults.mjs','README.md','ADMIN_SETUP.md','GITHUB_PAGES.md','SECURITY.md','LICENSE'];
let failed = false;

for (const file of required) {
  try { await access(resolve(root, file)); }
  catch { console.error(`[ERROR] missing ${file}`); failed = true; }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

for (const file of await walk(resolve(root, 'src'))) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(`[ERROR] syntax ${file}\n${result.stderr}`); failed = true; }
}


const { PUBLIC_DEFAULTS } = await import(pathToFileURL(resolve(root, 'scripts/public-defaults.mjs')).href);
if (PUBLIC_DEFAULTS.MAP_PROVIDER !== 'kakao') { console.error('[ERROR] expected Kakao as configured map provider'); failed = true; }
if (!String(PUBLIC_DEFAULTS.KAKAO_MAPS_JAVASCRIPT_KEY || '').trim()) { console.error('[ERROR] Kakao JavaScript key is empty'); failed = true; }
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(PUBLIC_DEFAULTS.SUPABASE_URL || ''))) { console.error('[ERROR] Supabase Project URL is missing or invalid'); failed = true; }
if (!String(PUBLIC_DEFAULTS.SUPABASE_PUBLISHABLE_KEY || '').startsWith('sb_publishable_')) { console.error('[ERROR] Supabase Publishable key is missing or invalid'); failed = true; }
if (/USERNAME|REPOSITORY/.test(String(PUBLIC_DEFAULTS.PUBLIC_SITE_URL || ''))) { console.error('[ERROR] PUBLIC_SITE_URL still contains a placeholder'); failed = true; }
for (const [key, value] of Object.entries(PUBLIC_DEFAULTS)) {
  const text = String(value || '');
  if (text.startsWith('sb_secret_') || /service_role/i.test(text)) { console.error(`[ERROR] forbidden secret-like value in public defaults: ${key}`); failed = true; }
}

const index = await readFile(resolve(root, 'index.html'), 'utf8');
for (const needle of ['./src/styles.css','./config.js','./src/main.js','og:image','site.webmanifest']) {
  if (!index.includes(needle)) { console.error(`[ERROR] index missing ${needle}`); failed = true; }
}

const { geometricMedian, buildHotspots } = await import(pathToFileURL(resolve(root, 'src/lib/geo.js')).href);
const midpoint = geometricMedian([{lat:0,lng:-1},{lat:0,lng:1}]);
if (!midpoint || Math.abs(midpoint.lat) > 1e-6 || Math.abs(midpoint.lng) > 1e-3) { console.error('[ERROR] geometricMedian sanity test failed'); failed = true; }
const participants = [{id:'a',name:'A',address:'A',lat:0,lng:0,createdAt:''},{id:'b',name:'B',address:'B',lat:.01,lng:.01,createdAt:''}];
const restaurants = Array.from({length:8},(_,i)=>({id:String(i),name:`R${i}`,lat:.005+(i%3)*.001,lng:.005+Math.floor(i/3)*.001}));
const spots = buildHotspots(restaurants, participants, {lat:.005,lng:.005});
if (spots.length < 1 || spots.length > 3) { console.error('[ERROR] hotspot sanity test failed'); failed = true; }

const { DEMO_PLACES, DEMO_SNAPSHOT } = await import(pathToFileURL(resolve(root, 'src/lib/demo.js')).href);
const demoCenter = geometricMedian(DEMO_SNAPSHOT.participants);
const demoHotspots = buildHotspots(DEMO_PLACES, DEMO_SNAPSHOT.participants, demoCenter, 3);
if (demoHotspots.length !== 3) { console.error('[ERROR] demo should produce exactly three compact recommendations'); failed = true; }
const threeFx = await readFile(resolve(root, 'src/lib/threeFx.js'), 'utf8');
if (!threeFx.includes('three@0.180.0') || !threeFx.includes('prefers-reduced-motion')) { console.error('[ERROR] Three.js recommendation layer configuration is incomplete'); failed = true; }
if (demoHotspots.some((spot) => spot.centerDistanceKm > (spot.recommendationRadiusKm || 0) * 1.45 + 0.01)) { console.error('[ERROR] demo recommendation escaped midpoint boundary'); failed = true; }
if (new Set(demoHotspots.map((spot) => spot.areaLabel)).size !== demoHotspots.length) { console.error('[ERROR] demo recommendations are not distinct meeting areas'); failed = true; }

if (failed) process.exit(1);
console.log('[OK] static checks passed');
