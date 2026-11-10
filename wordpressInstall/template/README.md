# __SITE_NAME__

The source for [__DOMAIN__](__PROD_URL__): a custom WordPress block theme, a must-use plugin for site behavior, custom blocks, a Vite build, coding standards in CI, and deploys that only ship our own code.

## Tech stack

| Area          | Choice                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| CMS           | WordPress, block theme (Site Editor)                                   |
| Theme         | Custom block theme: `theme.json`, HTML templates, PHP block patterns  |
| Site features | Must-use plugin: SEO, security, analytics, caching, custom blocks      |
| Styles        | `theme.json` tokens + SCSS (Dart Sass via `sass-embedded`)             |
| Scripts       | Vanilla ES modules, [Lenis](https://github.com/darkroomengineering/lenis) smooth scroll |
| Build         | [Vite](https://vite.dev) (theme assets) + `@wordpress/scripts` (blocks) |
| Quality       | PHPCS (WordPress Coding Standards, PHPCompatibility), ESLint, Stylelint |
| Local         | Docker: WordPress (PHP __PHP_VERSION__), __DB_LABEL__, phpMyAdmin, WP-CLI              |
| CI/CD         | GitHub Actions: lint, build, deploy over SSH with `rsync`              |

## Architecture

**The theme handles presentation, plugins handle behavior.** Switching themes should change how the site looks, never what it does.

- **Theme ([`public_html/wp-content/themes/__SLUG__`](public_html/wp-content/themes/__SLUG__))**
  - `theme.json` is the single source of design tokens: color palette, the self-hosted Rubik variable font, a fluid type scale and spacing. SCSS reads the CSS custom properties WordPress generates from it.
  - Templates: `front-page`, `page`, `page-no-title`, `index` and `404`.
  - Header with the site title and the **Main** menu (a Navigation menu with the slug `main-menu`, edited in Appearance → Editor → Navigation). The footer links to the Accessibility and Privacy pages when they're published.
  - Section patterns in the "__SITE_NAME__" category: Hero, Text section and Call to action. There are deliberately no full-page patterns: WordPress shows any full-page pattern in a "Choose a pattern" screen every time a page is added.
  - The **"Reveal on scroll"** block style on Group and Separator blocks fades a section's content in as it scrolls into view.
- **Must-use plugin ([`public_html/wp-content/mu-plugins`](public_html/wp-content/mu-plugins))**: always loaded, can't be deactivated, survives a theme switch.
<!-- @pages-only -->
  - `pages-only.php`: removes posts, categories, tags, comments, pingbacks and feeds from the admin, front end, sitemap and block inserter.
<!-- /@pages-only -->
  - `security.php`: disables XML-RPC and the file editors, hides REST user enumeration, uses one login error message for any failure, and sends security headers.
  - `seo.php`: meta description (from the page excerpt), Open Graph/Twitter tags, `WebSite` JSON-LD. Steps aside if a full SEO plugin is installed.
  - `site-settings.php`: **Settings → Site Settings**, editable site-wide fields grouped as Head (GTM ID, Google/Bing verification, custom head code), Header (empty, ready for fields) and Footer (footer text, contact details, social links). Fields are declared once in `__PREFIX___site_settings_fields()` (or the filter of the same name), which drives the admin screen, sanitizing and storage. Read values with `__PREFIX___site_setting( 'key' )`.
  - `analytics.php`: Google Tag Manager, only when `WP_ENVIRONMENT_TYPE` is `production` and a container ID is set in Site Settings. A `__PREFIX_UPPER___GTM_ID` constant in `wp-config.php` overrides it.
  - `htaccess.php`: browser caching and compression rules in `.htaccess`, between their own markers.
  - `blocks.php`: registers every block built into `__SLUG__/blocks/`.
- **Blocks ([`build_tools/src/blocks`](build_tools/src/blocks))**: one folder per block, built with `@wordpress/scripts`. Every block wraps its contents in an inner `<div class="container">`, which is a styling hook with no CSS of its own (see [`docs/blocks-and-markup.md`](docs/blocks-and-markup.md)).
  - `section` wraps any blocks in `<section>` + `.container`. It has only an HTML anchor (id) and custom classes, set in the Advanced panel.
  - `site-info` shows Site Settings values (footer text, contact details or social links). The footer uses it so values stay current even after the template is edited in the Site Editor: a dynamic block renders on every request, while PHP inside a pattern only runs once.
  - `callout` is an example dynamic block (`render.php` + inner blocks). Copy it to start a new one.

## Project structure

```
.
├── public_html/                      # Web root (WordPress). Only our code is in git:
│   ├── wp-cli.yml                    #   Lets WP-CLI write .htaccess rewrite rules
│   └── wp-content/
│       ├── themes/__SLUG__/          #   Block theme
│       └── mu-plugins/
│           ├── __SLUG__.php          #   Must-use plugin loader
│           └── __SLUG__/inc/         #   Site features
├── build_tools/                      # Node tooling (never deployed)
│   ├── src/js/  src/scss/            #   Theme scripts + styles  -> Vite
│   ├── src/blocks/                   #   Custom blocks           -> wp-scripts
│   ├── vite.config.js  vite-live-reload.js
│   └── eslint.config.cjs  .stylelintrc.json
├── CLAUDE.md  docs/blocks-and-markup.md   # Guidelines for Claude Code (blocks, markup, CSS rule)
├── scripts/                          # pull-db.sh, pull-uploads.sh (production -> local)
├── config/wp-config-production.sample.php
├── composer.json  phpcs.xml.dist     # PHP coding standards
├── docker-compose.yml
└── .github/workflows/deploy.yml
```

WordPress core, `wp-config.php`, uploads and third-party plugins are **not** in git. Locally, the WordPress Docker image copies core into `public_html/` on first start. On the server, they're managed there.

## Running locally

**Requirements:** Docker, Node.js 22+, Composer.

```bash
docker compose up -d          # WordPress -> http://localhost:__PORT__, phpMyAdmin -> http://localhost:__PMA_PORT__
cd build_tools
npm install
npm run watch                 # rebuild on save, with live reload
```

On a fresh clone, `docker compose up` copies WordPress core in and opens the installer. Then activate the **__SITE_NAME__** theme, create a Home page, set it as the homepage (Settings → Reading), and set permalinks to **Post name**. Or run `scripts/pull-db.sh` to copy production.

Docker sets `WP_ENVIRONMENT_TYPE` to `local`, so analytics never load. WP-CLI: `docker compose run --rm cli wp <command>`.

| Command                      | What it does                                          |
| ---------------------------- | ----------------------------------------------------- |
| `npm run build` (build_tools) | Production build of theme assets and blocks          |
| `npm run watch` (build_tools) | Rebuild on save, with live reload                    |
| `npm run lint:js` / `lint:css` | ESLint / Stylelint (WordPress configs)              |
| `npm run test:a11y` (build_tools) | axe-core WCAG 2.2 AA scan of every page + keyboard checks (`A11Y_URL=` to test another site) |
| `composer lint` / `lint:fix` | PHPCS: WordPress Coding Standards + PHP 8.1+ compatibility |
| `scripts/pull-db.sh`         | Copy the production database to local (asks first)    |
| `scripts/db-export.sh`       | Back up the local database to `db/`                   |
| `scripts/db-import.sh <file>` | Replace the local database with a dump (asks first)  |
| `scripts/pull-uploads.sh`    | Copy production media to local                        |

The scripts read SSH details from `.env` (copy [`.env.example`](.env.example)). Content flows **production → local**. Code flows **git → production**.

## Database

Local runs **__DB_LABEL__**, chosen to match production. Keep the engine and major version the same as the server, and update `image:` in `docker-compose.yml` if production is upgraded.

The database scripts run SQL through the database container's own `__DB_CLIENT__` / `__DB_DUMP__` tools, so they always match the server version. For an SQL shell: `docker compose exec db __DB_CLIENT__ -uroot -proot __PREFIX__`, or use phpMyAdmin.

WP-CLI's `wp db` commands (`export`, `import`, `query`, `cli`, `reset`) only work against **MariaDB 11.4 or newer**. The WP-CLI image ships MariaDB's latest client tools, which require TLS: MySQL 8 rejects them, and older MariaDB servers don't offer TLS. Every other WP-CLI command, including `search-replace`, works normally because it goes through PHP like WordPress does. The scripts above work with any engine and version.

## Accessibility

The target is **WCAG 2.2 Level AA**. What's built in:

- **Structure:** `header`, `nav` (labelled "Main"), `main` and `footer` landmarks, one `h1` per page, and core's "Skip to content" link. The theme moves keyboard focus onto `<main>` when the skip link is used, so screen readers announce the jump.
- **Keyboard:** a 2px focus ring on every link, button and field (white on dark backgrounds), and a skip link that's visible when focused. The mobile menu is a modal that traps focus, closes on Escape and returns focus to its toggle.
- **Color and text:** the editor is limited to the theme palette, whose text colors meet AA contrast. Links are underlined. Font sizes are fluid and relative, so text resizes to 200%.
- **Targets:** menu items, the menu buttons and buttons are at least 44px tall (WCAG 2.5.8 asks for 24px).
- **Motion:** scroll-reveal content is visible without JavaScript. Reduced-motion settings turn off animations and smooth scrolling.
- **Forced colors:** focus rings, buttons and separators stay visible in Windows High Contrast.
- **Accessibility statement:** the footer links to a page with the slug `accessibility` when one is published. Publish one before launch, stating the target, what's done, known limitations and how to report a problem.

**Testing:** `npm run test:a11y` in `build_tools/` loads every published page, plus search and 404 results, at desktop (1280px) and mobile (375px) widths. It runs axe-core with the WCAG 2.0/2.1/2.2 A and AA rules, then checks the skip link, the focus ring and the mobile menu from the keyboard. It exits non-zero on any problem. The first run needs `npx playwright install chromium`. ESLint also applies `jsx-a11y` rules to block code.

Automated tests only catch some accessibility issues. Before launch, also test with a screen reader (VoiceOver: Cmd+F5) and the keyboard alone, zoom to 200%, and check that every image has meaningful alt text (or empty alt if it's decorative).

## CI/CD

[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) lints every push and pull request (PHPCS, ESLint, Stylelint). On `main` it then builds and `rsync`s the theme and must-use plugin to the server. `--delete` is scoped to our own folders, so core, `wp-config.php`, uploads and other plugins are never touched.

**Repository secrets:** `SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `DEPLOY_PATH` (the WordPress root on the server, the folder that contains `wp-content`).

## Production setup

1. Install WordPress in `DEPLOY_PATH` with a non-default table prefix.
2. Apply [`config/wp-config-production.sample.php`](config/wp-config-production.sample.php): `WP_ENVIRONMENT_TYPE` = `production`, debug off with logging outside the web root, `DISALLOW_FILE_EDIT`, `FORCE_SSL_ADMIN`, minor-only core auto-updates, and a real cron job.
3. Push to `main` to deploy, then activate the theme.
4. Settings: allow search engines, use Post name permalinks, set the homepage, and add a Site Icon (the theme's SVG favicon is used until then).
5. Turn on page caching that suits the host (for example LiteSpeed Cache on LiteSpeed servers).
