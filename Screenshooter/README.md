# Screenshooter

A Claude Code skill for full-page screenshots of websites and HTML emails at Desktop / Tablet / Mobile widths, using Playwright.

## Install (once)

```bash
./install.sh
```

This runs `npm install` here (Playwright + Chromium) and symlinks this folder to `~/.claude/skills/screenshooter`, so the skill is available in every project with a single install. Edits made here take effect immediately.

## Use

In Claude Code, type `/screenshooter` or ask for screenshots. Claude asks:

1. Website or Email
2. **Website:** Local (files / localhost) or Remote URL — for Remote it asks for the URL right away
3. PDF (a page per screenshot) or PNGs in a zip file
4. Viewports — preset (Website `1440 / 768 / 375`, Email `600 / 375`) or custom widths
5. Order (Website only) — all Desktop, then Tablet, then Mobile; or Desktop/Tablet/Mobile per page

For websites it then opens a page editor in your browser: add URLs or scan the site (sitemap first, then link crawl), drag to reorder, duplicate a page to shoot several versions of it, and add custom JavaScript per row. The rows are saved as a `.pages.json` next to the output so you can reuse them. For emails it asks for the files or URLs. Then it saves one file to `./screenshots/<date>-<name>.pdf` (or `.zip`).

## Run the scripts directly

```bash
node scripts/shoot.mjs --type website \
  --viewports "desktop=1440,tablet=768,mobile=375" \
  --order by-viewport --format pdf --out ./shots \
  https://example.com https://example.com/about

node scripts/shoot.mjs --type email --viewports "desktop=600,mobile=375" \
  --order by-page --format zip ./emails/welcome.html ./emails/receipt.html
```

Options: `--name <file name>` for the output file, `--scale 2` for retina, `--wait <ms>` for extra settle time after load.

Find a site's pages without screenshotting them:

```bash
node scripts/discover.mjs example.com            # sitemap, else link crawl
node scripts/discover.mjs example.com/blog --method crawl --max 50
```

Open the page editor on its own, then shoot from what it saves:

```bash
node scripts/editor.mjs --out pages.json example.com example.com/about
node scripts/shoot.mjs --type website --format pdf --pages pages.json
```

`pages.json` is a list of `{ "url", "label", "js", "wait" }` — you can also write it by hand.
