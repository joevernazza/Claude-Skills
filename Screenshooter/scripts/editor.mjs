#!/usr/bin/env node
// Page editor — opens a local browser screen to reorder, duplicate, label and add custom JS
// to the pages before screenshotting. Writes the result as a pages.json for shoot.mjs --pages.
//
// Usage:
//   editor.mjs --out pages.json [--in pages.json] [--viewports N] [--no-open] [url ...]
//
// Starts with the pages from --in (or the URLs given). Exits when the user clicks
// "Start screenshots" (prints "SAVED <path>", exit 0) or "Cancel" (prints "CANCELLED", exit 2).
// Gives up after 60 minutes with no answer (exit 3).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const opts = { urls: [], open: true, viewports: 3 };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--out') opts.out = argv[++i];
  else if (a === '--in') opts.in = argv[++i];
  else if (a === '--viewports') opts.viewports = Number(argv[++i]) || 3;
  else if (a === '--no-open') opts.open = false;
  else if (a.startsWith('--')) fail(`Unknown option ${a}`);
  else opts.urls.push(a);
}
if (!opts.out) fail('Usage: editor.mjs --out pages.json [--in pages.json] [--viewports N] [url ...]');

let initial = opts.urls.map(url => ({ url, label: '', js: '', wait: 0 }));
if (opts.in) {
  try {
    const data = JSON.parse(fs.readFileSync(opts.in, 'utf8'));
    initial = (Array.isArray(data) ? data : data.pages || []).concat(initial);
  } catch (e) { fail(`Can't read ${opts.in}: ${e.message}`); }
}

const html = fs.readFileSync(path.join(HERE, 'editor.html'), 'utf8');

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function send(res, code, obj, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(obj) : obj);
}

function discover(url) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(HERE, 'discover.mjs'), url, '--max', '100']);
    let out = '', err = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => resolve({
      ok: code === 0,
      urls: out.split('\n').map(s => s.trim()).filter(Boolean),
      note: err.trim().split('\n').filter(l => !l.startsWith('  scanning')).pop() || '',
    }));
  });
}

let finished = false;
function finish(code, line) {
  if (finished) return;
  finished = true;
  console.log(line);
  setTimeout(() => process.exit(code), 300); // let the response reach the browser
}

const server = http.createServer(async (req, res) => {
  // Only accept requests from the page this server served (blocks other sites posting to localhost).
  const host = req.headers.host || '';
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return send(res, 403, { error: 'forbidden' });
  if (req.method === 'POST' && req.headers.origin && req.headers.origin !== `http://${host}`) return send(res, 403, { error: 'forbidden' });

  try {
    if (req.method === 'GET' && req.url === '/') return send(res, 200, html, 'text/html; charset=utf-8');
    if (req.method === 'GET' && req.url === '/api/pages') return send(res, 200, { pages: initial, viewports: opts.viewports });
    if (req.method === 'POST' && req.url === '/api/discover') {
      const { url } = await readBody(req);
      if (!url) return send(res, 400, { error: 'url required' });
      return send(res, 200, await discover(url));
    }
    if (req.method === 'POST' && req.url === '/api/save') {
      const { pages } = await readBody(req);
      if (!Array.isArray(pages) || !pages.length) return send(res, 400, { error: 'No pages to save' });
      const clean = pages.map(p => ({
        url: String(p.url || '').trim(),
        label: String(p.label || '').trim(),
        js: String(p.js || ''),
        wait: Math.max(0, Number(p.wait) || 0),
      }));
      const bad = clean.findIndex(p => !p.url);
      if (bad >= 0) return send(res, 400, { error: `Row ${bad + 1} has no URL` });
      const outPath = path.resolve(opts.out);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(clean, null, 2) + '\n');
      send(res, 200, { ok: true, path: outPath });
      return finish(0, `SAVED ${outPath}`);
    }
    if (req.method === 'POST' && req.url === '/api/cancel') {
      send(res, 200, { ok: true });
      return finish(2, 'CANCELLED');
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(0, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`Page editor open at ${url}`);
  if (opts.open) {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFile(cmd, [url], () => {});
  }
});

setTimeout(() => finish(3, 'TIMED OUT (no answer after 60 minutes)'), 60 * 60 * 1000).unref?.();
