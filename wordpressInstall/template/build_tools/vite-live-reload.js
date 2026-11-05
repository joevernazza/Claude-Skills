import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Live reload for `vite build --watch` when the page is served by something
 * other than Vite (here: PHP in Docker).
 *
 * - Starts a tiny Server-Sent Events server (default port 35729).
 * - Injects a small client into the entry chunk, in watch builds only.
 * - After each rebuild: style-only changes hot-swap the stylesheets,
 *   anything else does a full page reload.
 * - Also watches the given PHP/HTML files, which Vite doesn't know about.
 */
export default function liveReload({ port = 35729, watch = [] } = {}) {
  const clients = new Set();
  const changed = new Set();
  let enabled = false;
  let server;

  const send = (msg) => {
    for (const res of clients) res.write(`data: ${msg}\n\n`);
  };

  const start = () => {
    if (server) return;
    server = http.createServer((req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
    });
    server.listen(port, () => console.log(`\n[live-reload] listening on http://localhost:${port}`));

    let timer;
    for (const file of watch) {
      const target = path.resolve(file);
      if (!fs.existsSync(target)) continue;
      // Directories are watched recursively (theme templates/, parts/, patterns/)
      fs.watch(target, { recursive: fs.statSync(target).isDirectory() }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => send('reload'), 50);
      });
    }
  };

  const client = `;(()=>{const s=new EventSource('//'+location.hostname+':${port}');s.onmessage=e=>{if(e.data==='css'){document.querySelectorAll('link[rel="stylesheet"]').forEach(l=>{const u=new URL(l.href);if(u.origin!==location.origin)return;u.searchParams.set('lr',Date.now());l.href=u.href})}else location.reload()}})();\n`;

  return {
    name: 'live-reload',
    apply: 'build',
    configResolved(config) {
      enabled = !!config.build.watch;
    },
    buildStart() {
      if (enabled) start();
    },
    watchChange(id) {
      changed.add(id);
    },
    renderChunk(code, chunk) {
      if (enabled && chunk.isEntry) return { code: client + code, map: null };
    },
    writeBundle() {
      if (!enabled || !changed.size) return;
      const cssOnly = [...changed].every((id) => /\.(s?css|sass)$/.test(id));
      changed.clear();
      send(cssOnly ? 'css' : 'reload');
    },
  };
}
