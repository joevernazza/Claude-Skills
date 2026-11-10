#!/usr/bin/env node
// Discover a site's pages so they don't have to be listed by hand.
//
// Usage:
//   discover.mjs <site-url> [--max 100] [--method auto|sitemap|crawl]
//
// auto (default): use the sitemap (robots.txt Sitemap: lines, /sitemap.xml,
// /sitemap_index.xml, /wp-sitemap.xml); if none is found, crawl internal links
// starting from the given URL in a real browser (so JS-built menus work too).
//
// If the URL has a path (e.g. example.com/blog), only pages under that path are kept.
// Prints one URL per line on stdout. Progress and notes go to stderr.

import { chromium } from 'playwright';

const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|zip|rar|gz|mp4|mov|webm|mp3|wav|docx?|xlsx?|pptx?|csv|txt|json|xml|rss|atom|css|js|woff2?|ttf|eot)$/i;
const SKIP_PATH = /\/(wp-admin|wp-login\.php|wp-json|cart|checkout|my-account|login|logout|feed)(\/|$)|\/(tag|author)\//i;

function parseArgs(argv) {
  const opts = { max: 100, method: 'auto' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--max') opts.max = Number(argv[++i]);
    else if (a === '--method') opts.method = argv[++i];
    else if (a.startsWith('--')) fail(`Unknown option ${a}`);
    else opts.url = a;
  }
  if (!opts.url) fail('Usage: discover.mjs <site-url> [--max 100] [--method auto|sitemap|crawl]');
  if (!['auto', 'sitemap', 'crawl'].includes(opts.method)) fail('--method must be auto, sitemap or crawl');
  if (!Number.isInteger(opts.max) || opts.max < 1) fail('--max must be a positive whole number');
  return opts;
}

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

function toUrl(t) {
  if (/^https?:\/\//i.test(t)) return new URL(t);
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?(\/|$)/i.test(t)) return new URL(`http://${t}`);
  return new URL(`https://${t}`);
}

// The section of the site to stay inside: "/" for a home URL, "/blog/" for example.com/blog.
function scopeOf(site) {
  const p = site.pathname.replace(/\/index\.html?$/i, '/');
  if (p.endsWith('/')) return p;
  return /\.[a-z0-9]+$/i.test(p) ? p.slice(0, p.lastIndexOf('/') + 1) : `${p}/`;
}

const bareHost = h => h.replace(/^www\./i, '').toLowerCase();

// Normalise a link to a comparable page URL, or null if it isn't a page on this site.
function normalise(href, base, site) {
  let u;
  try { u = new URL(href, base); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (bareHost(u.hostname) !== bareHost(site.hostname) || u.port !== site.port) return null;
  if (SKIP_EXT.test(u.pathname) || SKIP_PATH.test(u.pathname)) return null;
  u.hash = '';
  u.search = '';
  u.protocol = site.protocol;
  u.hostname = site.hostname;
  u.pathname = u.pathname.replace(/\/index\.html?$/i, '/');
  if (!u.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(u.pathname)) u.pathname += '/';
  if (!u.pathname.startsWith(scopeOf(site))) return null;
  return u.href;
}

async function fetchText(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Screenshooter)' } });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
}

async function fromSitemap(site, max) {
  const candidates = [];
  const robots = await fetchText(new URL('/robots.txt', site).href);
  if (robots) for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) candidates.push(m[1]);
  const scope = scopeOf(site);
  const dirs = scope === '/' ? ['/'] : [scope, '/'];
  for (const d of dirs) candidates.push(...['sitemap.xml', 'sitemap_index.xml', 'wp-sitemap.xml'].map(f => new URL(d + f, site).href));

  const pages = new Set();
  const visited = new Set();
  const queue = [...new Set(candidates)];
  let foundAny = false;
  while (queue.length && pages.size < max) {
    const sm = queue.shift();
    if (visited.has(sm)) continue;
    visited.add(sm);
    const xml = await fetchText(sm);
    if (!xml || !/<(urlset|sitemapindex)\b/i.test(xml)) continue;
    // First real sitemap wins: drop the remaining fallback guesses (/sitemap.xml etc.).
    if (!foundAny) for (let i = queue.length - 1; i >= 0; i--) if (candidates.includes(queue[i])) queue.splice(i, 1);
    foundAny = true;
    const locs = [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)]
      .map(m => m[1].replace(/&amp;/g, '&'));
    if (/<sitemapindex\b/i.test(xml)) {
      queue.push(...locs);
    } else {
      for (const loc of locs) {
        const n = normalise(loc, site, site);
        if (n) pages.add(n);
        if (pages.size >= max) break;
      }
    }
  }
  return foundAny ? [...pages] : null;
}

async function fromCrawl(site, max) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const start = normalise(site.href, site, site) || site.href;
  const found = [start];
  const seen = new Set(found);
  try {
    for (let i = 0; i < found.length && i < max; i++) {
      console.error(`  scanning ${found[i]}`);
      try {
        await page.goto(found[i], { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      } catch { continue; }
      const hrefs = await page.$$eval('a[href]', as => as.map(a => a.getAttribute('href')));
      for (const h of hrefs) {
        const n = normalise(h, page.url(), site);
        if (n && !seen.has(n)) {
          seen.add(n);
          found.push(n);
        }
      }
    }
  } finally {
    await browser.close();
  }
  return found.slice(0, max);
}

// Home first, then by path so sections stay together.
function sortPages(pages, site) {
  const home = normalise('/', site, site);
  return [...new Set(pages)].sort((a, b) => {
    if (a === home) return -1;
    if (b === home) return 1;
    return new URL(a).pathname.localeCompare(new URL(b).pathname);
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const site = toUrl(opts.url);

  let pages = null;
  let via = '';
  if (opts.method !== 'crawl') {
    console.error(`Looking for a sitemap on ${site.origin} ...`);
    pages = await fromSitemap(site, opts.max);
    via = 'sitemap';
    if (!pages?.length && opts.method === 'sitemap') fail('No sitemap found');
    if (!pages?.length) console.error('No sitemap found — crawling links instead.');
  }
  if (!pages?.length) {
    pages = await fromCrawl(site, opts.max);
    via = 'link crawl';
  }

  pages = sortPages(pages, site);
  for (const p of pages) console.log(p);
  console.error(`\nFound ${pages.length} page${pages.length === 1 ? '' : 's'} via ${via}${pages.length >= opts.max ? ` (stopped at --max ${opts.max}; there may be more)` : ''}.`);
}

main().catch(err => fail(err.stack || err.message));
