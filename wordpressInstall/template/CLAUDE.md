# __SITE_NAME__

WordPress site: custom block theme (`public_html/wp-content/themes/__SLUG__`) + must-use plugin (`public_html/wp-content/mu-plugins/__SLUG__`). Only those two folders, `build_tools/`, `scripts/` and config are ours; WordPress core in `public_html/` is git-ignored and never edited.

## Rules

- **Don't change any CSS unless the user explicitly asks for it.** This covers:
  - SCSS in `build_tools/src/scss/` and blocks' `style.scss`;
  - style values in `theme.json` (colors, fonts, spacing, `styles`);
  - inline `style` attributes and style-related block attributes in markup;
  - adding new styles to existing files.

  It applies even to fixes that look obviously right. If a task seems to need a style change, describe the problem and the change you'd make, and ask first. A request to build something new (e.g. a block) doesn't cover restyling anything that already exists.
- **Every custom block wraps its contents in an inner `<div class="container">`**, in both `render.php` and `edit.js`. `.container` is a hook with no CSS. See "Every block has an inner `.container`" in the guidelines below.

- Local: `docker compose up -d` → http://localhost:__PORT__ (PHP __PHP_VERSION__, __DB_LABEL__). WP-CLI: `docker compose run --rm cli wp <command>`. `wp db` commands only work against MariaDB 11.4+; otherwise use `scripts/db-export.sh` / `db-import.sh`.
- Build and checks: see "Before you finish" in the guidelines below.
- Theme = presentation, must-use plugin = behavior. Site-wide editable values live in Settings → Site Settings (`inc/site-settings.php`).

Follow these when creating blocks, patterns, templates or any block markup:

@docs/blocks-and-markup.md
