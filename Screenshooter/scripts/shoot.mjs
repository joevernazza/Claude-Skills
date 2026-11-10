#!/usr/bin/env node
// Screenshooter — full-page screenshots of websites or emails across viewports.
//
// Usage:
//   shoot.mjs --type website|email \
//             --viewports "desktop=1440,tablet=768,mobile=375" \
//             --order by-viewport|by-page \
//             --format zip|pdf \
//             [--out ./screenshots] [--name NAME] [--scale 1] [--wait 500] \
//             <url-or-file> [<url-or-file> ...]
//
//   Or instead of listing targets, pass --pages pages.json (made by the page editor):
//     [{ "url": "https://example.com", "label": "home-menu-open", "js": "document.querySelector('.menu').click()", "wait": 1000 }, ...]
//   Each entry is shot in list order (duplicates allowed). "js" runs in the page after it loads
//   (it may use await); "wait" is extra ms after the JS. "label" names the file.
//
// Targets can be http(s) URLs, localhost addresses or local paths (e.g. email .html files).
// Output is a single file: <out>/<name>.zip (a series of PNGs) or <out>/<name>.pdf (one page per shot).

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { zipSync } from 'fflate';

function parseArgs(argv) {
  const opts = { type: 'website', order: 'by-viewport', format: 'zip', out: './screenshots', scale: 1, wait: 500, targets: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--type': opts.type = next(); break;
      case '--viewports': opts.viewports = next(); break;
      case '--order': opts.order = next(); break;
      case '--format': opts.format = next(); break;
      case '--out': opts.out = next(); break;
      case '--name': opts.name = next(); break;
      case '--pages': opts.pages = next(); break;
      case '--scale': opts.scale = Number(next()); break;
      case '--wait': opts.wait = Number(next()); break;
      case '-h': case '--help': usage(0); break;
      default:
        if (a.startsWith('--')) fail(`Unknown option ${a}`);
        opts.targets.push(a);
    }
  }
  return opts;
}

function usage(code) {
  console.log(`Usage: shoot.mjs --type website|email --viewports "desktop=1440,tablet=768,mobile=375" --order by-viewport|by-page --format zip|pdf [--out DIR] [--name NAME] [--scale N] [--wait MS] (<targets...> | --pages FILE)`);
  process.exit(code);
}

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

const slugify = s => String(s).replace(/^www\./, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();

function loadPages(file) {
  let list;
  try { list = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(`Can't read pages file ${file}: ${e.message}`); }
  if (!Array.isArray(list)) list = list?.pages;
  if (!Array.isArray(list) || !list.length) fail(`Pages file ${file} has no pages`);
  return list.map((p, i) => {
    if (!p?.url) fail(`Page ${i + 1} in ${file} has no url`);
    return { url: resolveTarget(p.url), label: p.label?.trim() || '', js: p.js?.trim() || '', wait: Number(p.wait) || 0 };
  });
}

const DEFAULT_VIEWPORTS = {
  website: 'desktop=1440,tablet=768,mobile=375',
  email: 'desktop=600,mobile=375',
};

const DEFAULT_HEIGHTS = { desktop: 900, tablet: 1024, mobile: 812 };

function parseViewports(spec) {
  const list = spec.split(',').map(s => s.trim()).filter(Boolean).map(entry => {
    const [name, width] = entry.split('=').map(s => s.trim());
    const w = Number(width);
    if (!name || !Number.isInteger(w) || w <= 0) fail(`Bad viewport "${entry}" — expected name=width, e.g. desktop=1440`);
    return { name: name.toLowerCase(), width: w, height: DEFAULT_HEIGHTS[name.toLowerCase()] ?? 900 };
  });
  if (!list.length) fail('No viewports given');
  return list;
}

function resolveTarget(t) {
  if (/^(https?|file):\/\//i.test(t)) return t;
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(t)) return `http://${t}`;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(t) && !fs.existsSync(t)) return `https://${t}`;
  const abs = path.resolve(t);
  if (!fs.existsSync(abs)) fail(`File not found: ${t}`);
  return pathToFileURL(abs).href;
}

function slugFor(target) {
  let s;
  try {
    const u = new URL(target);
    if (u.protocol === 'file:') {
      s = path.basename(u.pathname).replace(/\.[^.]+$/, '');
    } else {
      const p = u.pathname.replace(/\/+$/, '');
      s = p ? `${u.hostname}${p}` : `${u.hostname}-home`;
    }
  } catch { s = target; }
  return slugify(s) || 'page';
}

// Scroll the full page so lazy-loaded images/sections render, then return to top.
async function primeLazyContent(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!['website', 'email'].includes(opts.type)) fail('--type must be website or email');
  if (!['by-viewport', 'by-page'].includes(opts.order)) fail('--order must be by-viewport or by-page');
  if (!['zip', 'pdf'].includes(opts.format)) fail('--format must be zip or pdf');
  if (opts.pages && opts.targets.length) fail('Use either --pages or a list of targets, not both');
  if (!opts.pages && !opts.targets.length) fail('Give at least one URL or file, or --pages FILE');

  const viewports = parseViewports(opts.viewports || DEFAULT_VIEWPORTS[opts.type]);
  const targets = opts.pages ? loadPages(opts.pages) : opts.targets.map(t => ({ url: resolveTarget(t) }));

  // Unique slugs so two pages never overwrite each other.
  const seen = new Map();
  for (const t of targets) {
    const base = (t.label && slugify(t.label)) || slugFor(t.url);
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    t.slug = n > 1 ? `${base}-${n}` : base;
  }

  // Build the job list in the requested order.
  const jobs = [];
  if (opts.order === 'by-viewport') {
    for (const vp of viewports) for (const t of targets) jobs.push({ vp, t });
  } else {
    for (const t of targets) for (const vp of viewports) jobs.push({ vp, t });
  }

  const outDir = path.resolve(opts.out);
  fs.mkdirSync(outDir, { recursive: true });
  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
  const name = (opts.name || `${date}-${targets[0].slug}`).replace(/\.(zip|pdf)$/i, '');
  const outFile = path.join(outDir, `${name}.${opts.format}`);
  const shotDir = fs.mkdtempSync(path.join(os.tmpdir(), 'screenshooter-'));
  const pad = String(jobs.length).length < 2 ? 2 : String(jobs.length).length;

  const browser = await chromium.launch();
  const contexts = new Map();
  const results = [];
  try {
    for (const [i, { vp, t }] of jobs.entries()) {
      if (!contexts.has(vp.name)) {
        const isMobile = opts.type === 'website' && vp.name === 'mobile';
        contexts.set(vp.name, await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: opts.scale,
          isMobile,
          hasTouch: isMobile,
        }));
      }
      const page = await contexts.get(vp.name).newPage();
      const file = path.join(shotDir, `${String(i + 1).padStart(pad, '0')}-${vp.name}-${t.slug}.png`);
      try {
        await page.goto(t.url, { waitUntil: 'load', timeout: 60000 });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await primeLazyContent(page);
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        if (t.js) {
          try {
            await page.evaluate(`(async () => {\n${t.js}\n})()`);
          } catch (err) {
            throw new Error(`custom JS failed: ${err.message.split('\n')[0]}`);
          }
          await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        }
        const wait = (opts.wait || 0) + t.wait;
        if (wait) await page.waitForTimeout(wait);
        await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
        console.log(`✓ ${path.basename(file)}  (${vp.name} ${vp.width}px${t.js ? ', custom JS' : ''})`);
        results.push({ ok: true, file });
      } catch (err) {
        console.error(`✗ ${t.label ? `[${t.label}] ` : ''}${t.url} @ ${vp.name} ${vp.width}px — ${err.message.split('\n')[0]}`);
        results.push({ ok: false, url: t.url, viewport: vp.name, error: err.message });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  const saved = results.filter(r => r.ok).map(r => r.file);
  const failed = results.length - saved.length;
  if (saved.length) {
    if (opts.format === 'zip') await writeZip(saved, outFile);
    else await writePdf(saved, outFile, opts.scale || 1);
  }
  fs.rmSync(shotDir, { recursive: true, force: true });
  console.log(saved.length
    ? `\nDone: ${saved.length} screenshots, ${failed} failed → ${outFile}`
    : `\nNo screenshots saved (${failed} failed) — nothing written.`);
  process.exit(failed ? 1 : 0);
}

async function writeZip(files, outFile) {
  const entries = {};
  for (const f of files) entries[path.basename(f)] = [fs.readFileSync(f), { level: 0 }]; // PNGs are already compressed
  fs.writeFileSync(outFile, zipSync(entries));
}

// One PDF page per screenshot, sized to the image. PDF pages max out at 14400pt,
// so very tall full-page shots are scaled down to fit (the image keeps full resolution).
async function writePdf(files, outFile, scale) {
  const MAX = 14400;
  const pdf = await PDFDocument.create();
  for (const f of files) {
    const img = await pdf.embedPng(fs.readFileSync(f));
    const k = Math.min(1 / scale, MAX / img.height, MAX / img.width);
    const w = img.width * k, h = img.height * k;
    pdf.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
  }
  fs.writeFileSync(outFile, await pdf.save());
}

main().catch(err => fail(err.stack || err.message));
