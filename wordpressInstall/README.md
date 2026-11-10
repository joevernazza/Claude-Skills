# WordPress Install

A Claude Code skill that creates a new WordPress project from a production-ready template and installs it locally in Docker, fully configured, in one step.

The template is a generalized copy of the joevernazza.com build:

- **Block theme**: `theme.json` design tokens (palette, self-hosted Rubik variable font, fluid type, spacing), front-page/page/index/404 templates, a header with a **Main menu** and a footer, section patterns (Hero, Text section, Call to action; no full-page patterns, so adding a page doesn't open a "Choose a pattern" screen), a "Reveal on scroll" block style.
- **Accessibility (WCAG 2.2 AA)**: landmarks, a skip link that moves focus, visible focus rings, 44px targets, a keyboard-safe mobile menu, reduced-motion and forced-colors support, a footer link to an accessibility statement page once you publish one, and `npm run test:a11y` (axe-core + Playwright on every page, desktop and mobile, plus keyboard checks). The test runs automatically after every install.
- **Must-use plugin**: a **Site Settings** screen (Head: GTM ID, Search Console/Bing verification, custom head code; Header: ready for fields; Footer: footer text, contact details, social links), security hardening, SEO meta + JSON-LD, Google Tag Manager (production only), `.htaccess` caching rules, block registration, and an optional **pages-only** mode (no posts, comments or feeds).
- **Custom blocks** built with `@wordpress/scripts`: Section (`<section>` + inner container, with anchor and custom classes), Site Info (shows Site Settings values in the footer, always current) and an example Callout block. Every block wraps its contents in an inner `<div class="container">` styling hook.
- **Claude Code guidelines**: each project gets a `CLAUDE.md` (loaded automatically) and `docs/blocks-and-markup.md`, covering how to build blocks and write block markup, the container rule, accessibility requirements, and a rule not to change CSS unless asked.
- **Build**: Vite for theme SCSS/JS with a live-reload plugin; `npm run watch` rebuilds on save.
- **Quality**: PHPCS (WordPress Coding Standards + PHPCompatibility), ESLint, Stylelint.
- **Local**: Docker with WordPress on **the PHP version production runs** (`--php`, default 8.4) and **MySQL or MariaDB at the version production runs** (`--db`, `--db-version`; default MySQL 8.4 LTS), phpMyAdmin and WP-CLI. Images are pinned by digest at creation time. Database scripts use the database container's own client tools, so they match the server exactly.
- **Deploy**: GitHub Actions lints every push and `rsync`s the theme + plugin to the server on `main`.
- **Content sync**: `scripts/pull-db.sh` / `pull-uploads.sh` copy production to local; `db-export.sh` / `db-import.sh` back up and restore the local database.

## Install (once)

```bash
./install.sh
```

Symlinks this folder to `~/.claude/skills/wordpress-install`. Edits here take effect immediately.

## Use

In Claude Code, type `/wordpress-install` or ask for a new WordPress site. Claude asks for the site name, folder, production URL, tagline and admin email, then pages-only vs blog, analytics and git, and runs the script. A few minutes later you get the local URL and admin login.

## Run the script directly

```bash
node scripts/create-site.mjs --dir ~/Work/acme --name "Acme Studio" \
  --tagline "Design and build" --prod-url https://acme.com --git
```

`--help` lists every option (`--php`, `--db`, `--db-version`, `--no-pages-only`, `--gtm`, `--port`, `--admin-user`, `--admin-email`, `--admin-password`, `--slug`, `--prefix`, `--no-start`, ...).

Requirements: Docker (running), Node 18+, and optionally Composer for PHPCS.

## Template tokens

Files and folder names in `template/` use these tokens, filled in by the script: `__SITE_NAME__`, `__SLUG__`, `__PREFIX__`, `__PREFIX_UPPER__`, `__PROJECT__`, `__DOMAIN__`, `__PROD_URL__`, `__PORT__`, `__PMA_PORT__`, `__AUTHOR__`, `__GTM_ID__`, `__INITIALS__`, `__YEAR__`. Code between `@pages-only` markers is removed when pages-only mode is off. The script refuses to finish if any token is left unreplaced.
