import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadProjectEnv, runtimeConfig } from './env.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist');
const env = await loadProjectEnv(root);
const siteUrl = (env.PUBLIC_SITE_URL || 'https://USERNAME.github.io/REPOSITORY').replace(/\/$/, '');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, 'src'), resolve(dist, 'src'), { recursive: true });
await cp(resolve(root, 'public'), dist, { recursive: true });

const indexTemplate = await readFile(resolve(root, 'index.html'), 'utf8');
await writeFile(resolve(dist, 'index.html'), indexTemplate.replaceAll('__SITE_URL__', siteUrl), 'utf8');
await writeFile(resolve(dist, 'config.js'), `window.__MIDDLE_MEET_CONFIG__ = ${JSON.stringify(runtimeConfig(env), null, 2)};\n`, 'utf8');
await writeFile(resolve(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, 'utf8');
await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc></url>\n</urlset>\n`, 'utf8');

console.log(`[OK] dist generated for ${siteUrl}`);
