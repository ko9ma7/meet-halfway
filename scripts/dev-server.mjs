import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { loadProjectEnv, runtimeConfig } from './env.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const rootArg = process.argv[2] || '.';
const root = resolve(projectRoot, rootArg);
const port = Number(process.argv[3] || (rootArg === 'dist' ? 4173 : 5173));
const env = await loadProjectEnv(projectRoot);
const configSource = `window.__MIDDLE_MEET_CONFIG__ = ${JSON.stringify(runtimeConfig(env), null, 2)};\n`;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.webmanifest':'application/manifest+json', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname === '/config.js' && rootArg !== 'dist') {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
      res.end(configSource); return;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const safe = normalize(pathname).replace(/^([.][.][/\\])+/, '');
    let file = join(root, safe);
    if (!file.startsWith(root) || !existsSync(file)) file = join(root, '404.html');
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(file.endsWith('404.html') && safe !== '/404.html' ? 404 : 200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    res.writeHead(500, { 'content-type':'text/plain; charset=utf-8' });
    res.end(error instanceof Error ? error.message : 'Server error');
  }
});

server.listen(port, '127.0.0.1', () => console.log(`[OK] http://127.0.0.1:${port}/ (${root})`));
