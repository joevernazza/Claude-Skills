---
name: screenshooter
description: Take full-page screenshots of websites or HTML emails at Desktop/Tablet/Mobile viewports using Playwright. Use when the user asks for screenshots of a site, pages, URLs, or email templates (e.g. "screenshot these pages", "grab desktop and mobile shots of this email", "/screenshooter").
---

# Screenshooter

Full-page screenshots of websites or emails across viewports. The script lives next to this file at `scripts/shoot.mjs` (this skill's base directory is given when it loads — call it `$SKILL_DIR`).

## Step 1 — Ask the questions (always, in this order)

Use the AskUserQuestion tool for each question. Ask them one at a time because later questions depend on earlier answers. Keep the wording exactly as below.

**Q1 — content type**
"What type of content are we making screenshots for?"
- `Website`
- `Email`

### If Website

**Q2 — source**
"Are we screenshotting local or remote URLs?"
- `Local` — description: "Files on this computer or a local dev server (localhost)"
- `Remote URL` — description: "Live or staging URLs on the web — or pick Other and paste the URL"

**If they pick Remote URL**, ask right away in plain text (before Q3): "What's the URL? (A site to scan, or several page URLs one per line.)" and wait for the answer. If they typed a URL into Other instead, treat that as Remote URL with that URL and skip this. For one site URL, start `discover.mjs` on it now (it can run while you ask the remaining questions) and prefill the editor with its results in Step 2; for several URLs, prefill the editor with them as given.

**Q3 — output format**
"How do you want the screenshots delivered?"
- `PDF` — description: "One PDF with a page per screenshot" → `--format pdf`
- `PNGs in a zip` — description: "A series of PNG files in a zip file" → `--format zip`

**Q4 — viewports**
"What viewports are we using?"
- `1440 Desktop / 768 Tablet / 375 Mobile`
- `Custom widths` — description: "____ Desktop / ___ Tablet / ___ Mobile"

If they pick Custom (or type widths into "Other"), get three widths from them — Desktop, Tablet, Mobile. If they leave one blank or say "none", drop that viewport.

**Q5 — order**
"What order do you prefer?"
- `All Desktop, then Tablet, then Mobile` — description: "All Desktop pages, then all Tablet pages, then all Mobile pages" → `--order by-viewport`
- `Desktop/Tablet/Mobile per page` — description: "Desktop/Tablet/Mobile for each page" → `--order by-page`

### If Email

No local/remote question for emails.

**Q2 — output format**
"How do you want the screenshots delivered?"
- `PDF` — description: "One PDF with a page per screenshot" → `--format pdf`
- `PNGs in a zip` — description: "A series of PNG files in a zip file" → `--format zip`

**Q3 — viewports**
"What viewports are we using?"
- `600 Desktop / 375 Mobile`
- `Custom widths` — description: "___ Desktop / ___ Tablet / ___ Mobile"

Same custom handling as Website (blank viewports are dropped). Emails are shot per email (Desktop/Mobile for each email) → `--order by-page`. Do not ask the order question for emails.

## Step 2 — Get the targets

### Website: the page editor screen

For websites, open the page editor in the user's browser right after the questions. Don't ask for URLs in chat first — the screen has its own **Add URL** and **Scan a site** boxes. In it the user can drag or ↑/↓ to reorder, ⧉ duplicate a page (e.g. 3 versions of the home page), give each row a label (used in the file name), and add custom JavaScript plus an extra wait per row.

1. Make sure it's installed (Step 3), then start the editor **in the background** (Bash `run_in_background: true`) so it can wait for the user:
   ```bash
   node "$SKILL_DIR/scripts/editor.mjs" --out "./screenshots/<YYYY-MM-DD>-<name>.pages.json" --viewports <number of viewports chosen> [prefill URLs...]
   ```
   - If the user already gave URLs in chat, pass them as prefill arguments.
   - If they named a site to scan, run `node "$SKILL_DIR/scripts/discover.mjs" <site> --max 100` first and pass its output URLs as prefill.
   - To reuse an earlier run's pages (labels and JS included), add `--in <old .pages.json>`. If `./screenshots/` already has a `.pages.json` for this site, mention it and offer to load it.
2. Tell the user in one line: the editor is open in their browser (print the URL from the output in case the tab didn't open); click **Start screenshots** when done.
3. Wait for the background command to finish — don't poll. Its last output line is:
   - `SAVED <path>` → continue to Step 4 with `--pages <path>`.
   - `CANCELLED` → stop and tell the user nothing was taken.
   - `TIMED OUT …` → tell the user, and offer to reopen it with `--in <same path>` if the file exists.

For **Local** dev-server URLs, check the server responds (`curl -sI <url>`) before opening the editor; if it doesn't, tell the user it isn't running rather than starting one yourself.

**Custom JS notes** (if the user asks for help writing it): it runs in the page after load and lazy-load scrolling, before the screenshot, at every viewport; `await` works; `innerWidth` lets it branch per viewport. If it throws, that shot fails with "custom JS failed: …".

### Email: get the files or URLs

Ask in plain text (not AskUserQuestion): "Which emails? Paste HTML file paths, a folder, or hosted URLs (e.g. a "view in browser" link), one per line." Accept any mix:
- A folder → expand it to its `.html` files, sorted by name.
- Files and URLs → use them as given.

Output: a single file saved to `./screenshots/` in the current working directory, named `<YYYY-MM-DD>-<site-or-email-name>.pdf` or `.zip`. Pass `--name` with a short name (e.g. `2026-01-01-acme-site`) when the first page's slug wouldn't make a good file name. Only ask about location if the user implied a different one.

## Step 3 — Make sure it's installed

```bash
test -d "$SKILL_DIR/node_modules/playwright" -a -d "$SKILL_DIR/node_modules/pdf-lib" -a -d "$SKILL_DIR/node_modules/fflate" || (cd "$SKILL_DIR" && npm install)
```

`npm install` also downloads Chromium via the postinstall script. It only ever runs once — every project shares this one install.

## Step 4 — Run it

```bash
node "$SKILL_DIR/scripts/shoot.mjs" \
  --type website \
  --viewports "desktop=1440,tablet=768,mobile=375" \
  --order by-viewport \
  --format pdf \
  --out "./screenshots" \
  --name "2026-01-01-example" \
  --pages "./screenshots/2026-01-01-example.pages.json"
```

- Websites: pass `--pages <file>` from the editor. Emails: pass the files/URLs as arguments instead (no `--pages`).
- `--viewports` is `name=width` pairs, comma separated, in Desktop → Tablet → Mobile order. Only include the viewports the user chose.
- Add `--scale 2` if the user asks for retina / high-DPI shots.
- Add `--wait 2000` for sites with slow animations or carousels.
- Quote any file paths that contain spaces.

The screenshots go into the PDF / zip in the order the user picked (for websites, the row order from the editor; duplicated rows each get their own shots, named by their label). PDF: one page per screenshot, sized to the image. Zip: PNGs numbered in that order, e.g. `01-desktop-example-com-home.png`, `02-desktop-example-com-about.png`, … so sorting by name matches.

## Step 5 — Report

Tell the user the path of the PDF or zip file, how many screenshots it contains, and list any failures with the error line from the script. If a page failed with a timeout, offer to retry it with a longer `--wait`.
