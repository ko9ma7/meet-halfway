import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const required = ['index.html','config.js','src/main.js','src/styles.css','public/favicon.svg','public/favicon.ico','public/og-image.png','public/site.webmanifest','public/404.html','supabase/schema.sql','.github/workflows/deploy.yml','github-bootstrap.cmd','README.md','LICENSE'];
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

if (failed) process.exit(1);
console.log('[OK] static checks passed');
