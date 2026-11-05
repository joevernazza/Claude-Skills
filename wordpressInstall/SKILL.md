---
name: wordpress-install
description: Scaffold and install a new local WordPress site from a production-ready template (custom block theme with theme.json + patterns and a Main menu, WCAG 2.2 AA accessibility setup with axe-core tests, must-use plugin for SEO/security/analytics/caching, optional pages-only mode, @wordpress/scripts custom blocks, Vite build with live reload, PHPCS/ESLint/Stylelint, Docker with MySQL or MariaDB matched to production + WP-CLI, GitHub Actions rsync deploy). Use when the user asks to create, start, spin up or scaffold a new WordPress site/project/install, or invokes /wordpress-install or /wordpressInstall.
---

# WordPress Install

Creates a new WordPress project from the template in this skill's `template/` folder, then installs and configures it locally in Docker. The script is `scripts/create-site.mjs` (this skill's base directory is given when it loads; call it `$SKILL_DIR`). It has no npm dependencies.

## Step 1: Collect the details

First ask in **plain text** (one message), since these are free-form:

> To set up the new WordPress site I need:
> 1. **Site name** (required), e.g. "Acme Studio"
> 2. **Folder**: where to create it (default: `~/Work/<site-slug>`)
> 3. **Production URL** (optional), e.g. https://acme.com
> 4. **Tagline** (optional)
> 5. **Admin email** (default: your git email)
> 6. **PHP version on the server** (default: 8.4; cPanel shows it under Select PHP Version / MultiPHP Manager)

Then ask the choices with **AskUserQuestion** (one call, four questions):

- **"What kind of site is this?"** (header "Content")
  - `Pages only (Recommended)`: "No posts, comments or feeds; admin and front end are cleaned up for a brochure/portfolio site" → `--pages-only`
  - `Pages + blog`: "Keep posts, categories and comments" → `--no-pages-only`
- **"Set up Google Tag Manager?"** (header "Analytics")
  - `No analytics`: "Can be added later in wp-config.php"
  - `Yes, I'll paste the ID`: "Pick Other and paste the GTM-XXXXXXX container ID; it's saved in Settings > Site Settings" → `--gtm <id>`
- **"Which database does production run? Local will match it."** (header "Database")
  - `MySQL 8.4 (Recommended)`: "Current MySQL LTS" → `--db mysql --db-version 8.4`
  - `MySQL 8.0`: "Only if the server is still on 8.0 (end of life since April 2026)" → `--db mysql --db-version 8.0`
  - `MariaDB 11.4`: "Current MariaDB LTS" → `--db mariadb --db-version 11.4`
  - `MariaDB 10.6`: "Older MariaDB LTS, common on cPanel" → `--db mariadb --db-version 10.6`
  (Other: they type an exact version, e.g. "MariaDB 10.11" → `--db mariadb --db-version 10.11`. If they don't know, suggest checking phpMyAdmin's home screen ("Server type"/"Server version") and default to MySQL 8.4.)
- **"Create a git repository with an initial commit?"** (header "Git")
  - `Yes (Recommended)`: "git init on main + first commit of the scaffolded code" → `--git`
  - `No`: "Leave version control to me"

Derive the slug yourself (kebab-case of the name) and only pass `--slug`/`--prefix` if the user asked for specific ones. If the folder they give already exists and isn't empty, ask for another before running.

## Step 2: Check prerequisites

```bash
docker info >/dev/null 2>&1 && echo docker-ok; node -v; command -v composer
```

- Docker must be running (if not, ask the user to start Docker Desktop; don't start it yourself).
- Node 18+ is required. Composer is optional (without it, PHPCS isn't installed; mention that).

## Step 3: Run it

```bash
node "$SKILL_DIR/scripts/create-site.mjs" \
  --dir "<folder>" --name "<Site Name>" \
  [--tagline "<tagline>"] [--prod-url "<url>"] [--admin-email "<email>"] \
  [--pages-only | --no-pages-only] [--gtm GTM-XXXX] [--git] \
  [--php <x.y>] [--db mysql|mariadb] [--db-version <x.y>]
```

Use a 10-minute timeout (first run pulls Docker images and npm packages). Quote paths with spaces. Other options (`--help` lists all): `--port <n>` (default: first free pair from 8090), `--admin-user`, `--admin-password`, `--author`, `--no-start` (files only).

What it does, in order (stop and report if any step fails; the error says what to check):

1. Copies `template/`, filling in the name, slug, PHP prefix, URLs and ports, and removes pages-only code if not wanted.
2. `npm install` + `npm run build` in `build_tools/` (Vite theme assets + wp-scripts blocks), `composer install` (PHPCS).
3. Pulls the Docker images (WordPress on the chosen PHP version, the database at the chosen engine and version) and **pins them by digest** in `docker-compose.yml`, then `docker compose up -d`.
4. WP-CLI: installs WordPress, sets the tagline, activates the theme, deletes Akismet/Hello Dolly and extra default themes (keeps core's default as a fallback), sets Post-name permalinks, writes `.htaccess` caching rules, and deletes sample content. It creates a blank **Home** page as the front page and the **Main** menu (Home) used by the header. The theme has no full-page patterns on purpose: WordPress would show them in a "Choose a pattern" screen on every new page. Search engines are discouraged locally.
5. Checks the homepage renders with the theme and no PHP errors.
6. Runs the accessibility test (`npm run test:a11y`): axe-core WCAG 2.2 AA on every page at desktop + mobile widths, plus keyboard checks (skip link, focus ring, mobile menu). It installs Playwright's Chromium on the first run.
7. Optional `git init` + initial commit.

## Step 4: Report

Give the user, from the script's final output:
- Site URL, admin URL, **username and password** (the password is only printed once; tell them to save it), phpMyAdmin URL
- The database engine and version. Unless it's MariaDB 11.4+, mention that `wp db` commands don't work (WP-CLI's bundled MariaDB client requires TLS, which MySQL 8 and older MariaDB don't accept/offer); use `scripts/db-export.sh`, `scripts/db-import.sh`, `scripts/pull-db.sh` or phpMyAdmin instead.
- The accessibility test result. If it failed, list the problems it printed; the site is still installed.
- The project folder, and `cd build_tools && npm run watch` for development with live reload
- That the project has a `CLAUDE.md` + `docs/blocks-and-markup.md` with block/markup guidelines (including: no CSS changes unless asked; every block has an inner `.container`), which Claude Code loads automatically in that folder.
- Next steps: fill in Settings → Site Settings (footer text, contact details, social links, Search Console/Bing verification, GTM), edit `theme.json` (palette/fonts; re-run `npm run test:a11y` after color changes), build the Home page from the section patterns, add pages (publish an Accessibility statement at `/accessibility/` and the footer links to it), edit the menu in Appearance → Editor → Navigation, set GitHub secrets (`SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `DEPLOY_PATH`) before pushing to `main`, and follow the project README's "Production setup"

If it failed partway, say which step, show the error line, and suggest the fix. To retry from scratch the user must remove the folder and the Docker project (`docker compose down -v` inside it); confirm with them before deleting anything.

## Maintaining the template

`template/` was generalized from joevernazza.com. Tokens: `__PHP_VERSION__`, `__DB_IMAGE__`, `__DB_LABEL__`, `__DB_CLIENT__`, `__DB_DUMP__` (database engine), `__SITE_NAME__`, `__SLUG__` (folders, text domain, handles, block namespace), `__PREFIX__` / `__PREFIX_UPPER__` (PHP functions, options, constants, DB name), `__PROJECT__`, `__DOMAIN__`, `__PROD_URL__`, `__PORT__`, `__PMA_PORT__`, `__AUTHOR__`, `__GTM_ID__`, `__INITIALS__`, `__YEAR__`. Tokens work in file and folder names too. Lines between `// @pages-only` / `<!-- @pages-only -->` markers are removed when pages-only is off. Lines between `@db:mysql` … `/@db:mysql` (or `mariadb`) markers, in any comment style, are kept only for that engine. The script fails if any token is left unreplaced.
