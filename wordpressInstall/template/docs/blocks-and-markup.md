# Blocks and markup guidelines

Rules for creating custom blocks and writing block markup (patterns, templates, template parts) in this project. Follow them unless the user explicitly asks otherwise. Where a rule exists because of something that broke before, the reason is given.

## Where things live

| What | Where |
| --- | --- |
| Block source (edit here) | `build_tools/src/blocks/<name>/` |
| Block build output (generated, git-ignored, never edit) | `public_html/wp-content/mu-plugins/__SLUG__/blocks/<name>/` |
| Block registration | Automatic: `mu-plugins/__SLUG__/inc/blocks.php` registers every built folder that has a `block.json` |
| Patterns | `public_html/wp-content/themes/__SLUG__/patterns/*.php` |
| Templates / template parts | `themes/__SLUG__/templates/*.html`, `themes/__SLUG__/parts/*.html` |
| Design tokens | `themes/__SLUG__/theme.json` |
| Global SCSS (not block-specific) | `build_tools/src/scss/global/` |
| Site-wide editable values | Settings → Site Settings (`mu-plugins/__SLUG__/inc/site-settings.php`) |

Blocks belong to the **must-use plugin**, not the theme. Content must survive a theme switch.

## Creating a block

### 1. Start from an existing block

Copy the closest one:
- **`section`**: the simplest block. It's `<section>` + `.container` around any inner blocks, with only the anchor (id) and custom-class supports.
- **`callout`**: a dynamic block with a RichText attribute and inner blocks.
- **`site-info`**: a dynamic block with no inner blocks, a `ServerSideRender` preview and an Inspector control.

Each block folder contains:

```
build_tools/src/blocks/<name>/
├── block.json
├── index.js      # registerBlockType( metadata.name, { edit, save } )
├── edit.js       # editor UI
├── render.php    # front-end output (dynamic blocks)
└── style.scss    # front end + editor styles (imported by index.js)
```

### Every block has an inner `.container` (required)

Every custom block wraps its contents in `<div class="container">`, directly inside the block's outer element:

```html
<section class="wp-block-__SLUG__-section my-class" id="my-anchor">
	<div class="container">
		…the block's contents / inner blocks…
	</div>
</section>
```

- Do this in **both** `render.php` (front end) and `edit.js` (editor), so the editor's DOM matches. For inner blocks, put the class on the inner-blocks element: `useInnerBlocksProps( { className: 'container' } )`. Otherwise wrap the contents in `<div className="container">`.
- **Outer element:** carries `get_block_wrapper_attributes()` / `useBlockProps()` (supports, anchor id, custom classes). The block's own BEM classes stay on the elements they style. Don't move them onto `.container`.
- **Text-level blocks:** if a block's content is a `<p>`, `<ul>` or `<span>`, the outer element must be a `<div>`, because a `<div>` can't go inside those. See `site-info/render.php`: `<div wrapper><div class="container"><p class="site-info …">`.
- **`.container` has no styles.** It's a hook. Don't add CSS for it unless asked (see the CSS rule in `CLAUDE.md`).
- **Check existing child selectors:** adding the wrapper moves the contents one level deeper. Any existing `.block > *` selector stops matching, and that changes layout without any CSS edit. Report this to the user instead of changing the CSS. For example, Callout's `.callout > * + *` spacing no longer applies.

### 2. `block.json`

- `"apiVersion": 3`, `"name": "__SLUG__/<kebab-name>"`, `"textdomain": "__SLUG__"`.
- Give it a real `category` (`text`, `design`, `theme`, `media`, `widgets`), an `icon` (a Dashicon name), a one-sentence `description` and `keywords`.
- Every attribute needs a `type` and a `default`. Use `enum` when there's a fixed set of values.
- `supports`: always set `"html": false`. Only turn on what the design needs (`color`, `typography.fontSize`, `spacing.margin`/`padding`, `anchor`). Don't enable custom colors or font sizes beyond the theme presets.
- Add an `example` so the inserter preview isn't empty.
- File references: `"editorScript": "file:./index.js"`, `"style": "file:./style-index.css"`, `"render": "file:./render.php"`. wp-scripts names the compiled CSS `style-index.css`.

### 3. Make it dynamic (default)

Prefer **dynamic blocks**: `render.php` outputs the markup, and `save` returns `null` (no inner blocks) or `<InnerBlocks.Content />` (with inner blocks).

**Why:** a static block stores its HTML in the post. Changing its markup later makes every existing copy show "This block contains unexpected or invalid content" unless you write a `deprecated` entry. Dynamic blocks can change their markup freely.

Only write a static `save()` if the user asks for one. When you change a static block's output, add a `deprecated` entry for the old version.

### 4. `index.js` and `edit.js`

- **Imports need explicit `.js` extensions**, e.g. `import Edit from './edit.js';`. `build_tools/package.json` is `"type": "module"`, so webpack requires fully specified paths. Missing extensions fail the build.
- Use `@wordpress/*` packages only. They're webpack externals (the `wp.*` globals) and are **not installed** in `node_modules`. When you import a `@wordpress/*` package that isn't used yet, add it to `import/core-modules` in `build_tools/eslint.config.cjs`, or ESLint reports `import/no-unresolved`. Currently listed: `blocks`, `block-editor`, `components`, `i18n`, `server-side-render`.
- Always spread `useBlockProps()` on the editor wrapper.
- Editable text: `RichText` with a `tagName` and a `placeholder`. Limit formatting with `allowedFormats` (`[]` for plain text).
- Settings: `InspectorControls` → `PanelBody` → controls. Pass `__next40pxDefaultSize` and `__nextHasNoMarginBottom` to `@wordpress/components` controls to avoid deprecation warnings.
- Inner blocks: `InnerBlocks` with `allowedBlocks` and a `template`.
- Preview of server-rendered output: `ServerSideRender` from `@wordpress/server-side-render`.
- Every user-facing string goes through `__( 'Text', '__SLUG__' )`.

### 5. `render.php`

- Wrap the output in `get_block_wrapper_attributes( array( 'class' => '<base-class>' ) )`. This applies supports (colors, font size, spacing, anchor) and the `wp-block-__SLUG__-<name>` class. Add a `phpcs:ignore` with the reason ("escaped by core").
- **Prefix every variable** with `$__PREFIX___`. render.php runs in the global scope, and PHPCS (`WordPress.NamingConventions.PrefixAllGlobals`) fails otherwise.
- Escape at output, every time:

| Value | Function |
| --- | --- |
| Plain text | `esc_html()` |
| HTML attributes | `esc_attr()` |
| URLs | `esc_url()` (`mailto:`/`tel:` need the protocol allowed, e.g. `esc_url( $u, array( 'tel' ) )`) |
| RichText attribute values | `wp_kses_post()` |
| Translatable text | `esc_html__()` / `esc_attr__()` |

- Inner blocks arrive already rendered in `$content`. Echo them with a `phpcs:ignore` ("rendered inner blocks").
- Output nothing when there's nothing to show. To guide editors, show a hint only in the editor preview, using `wp_is_serving_rest_request()` (see `site-info/render.php`).
- Define helper functions inside `if ( ! function_exists( '__SLUG___...' ) )`, because render.php can run many times per page.
- Read site-wide values with `__PREFIX___site_setting( 'key', 'fallback' )`. Never hardcode contact details, IDs or URLs that an editor might change; add a Site Settings field instead (see "Site-wide values" below).

### 6. `style.scss`

Only write or change styles when the user has explicitly asked for them (see the CSS rule in `CLAUDE.md`). The conventions below describe how to write styles once you've been asked.

- **BEM class names:** `.block`, `.block__element`, `.block--modifier`, lowercase. Stylelint enforces this.
- Use theme tokens with a fallback, never raw values: `var(--wp--preset--color--primary, #1e293b)`, `var(--wp--preset--spacing--40, 24px)`, `var(--wp--preset--font-size--small)`.
- Keep spacing inside the block. Spacing between blocks comes from the layout's `blockGap`.
- Use double quotes in `@use`, and leave a blank line between rules (Stylelint).

### 7. Accessibility (required, WCAG 2.2 AA)

- **Semantic elements:** use `<section>`, `<aside>`, `<nav>`, `<ul>`/`<ol>`, `<button>` and `<time datetime>` for their purpose. Use `<button>` for actions and `<a href>` for navigation. Never put a click handler on a `<div>`.
- **Headings follow the page outline:** one `<h1>` per page (the hero on the front page, or `post-title` in `page.html`). Sections use `<h2>`, and items inside a section use `<h3>`. If a block outputs a heading, make its level an attribute when it could be used at different depths.
- **Accessible names:**
  - Every control has a visible label or an `aria-label`.
  - Lists and regions that need a name get `aria-label`, e.g. `<ul aria-label="Social media">`.
  - Icon-only controls need text, e.g. `<span class="screen-reader-text">`.
- **Images:** `alt` is required. Use empty `alt=""` only for decorative images.
- **Links:** they stay underlined, and color is never the only signal. A link that opens a new tab adds `<span class="screen-reader-text"> (opens in a new tab)</span>`.
- **Targets:** interactive elements are at least 24×24px (WCAG 2.5.8); aim for 44px on buttons and menu items.
- **Focus:** never remove focus outlines. The global `:focus-visible` ring in `scss/global/_a11y.scss` covers new elements automatically.
- **Motion:** animate only inside `@media (prefers-reduced-motion: no-preference)` or via the existing reveal system, and content must be readable without JavaScript.
- **Contrast:** use palette colors. Text colors on `light`/`white` are `primary` or `secondary`, and `white` on `primary`. Run `npm run test:a11y` after any color change.

## Writing block markup (patterns, templates, parts)

### Block comment syntax

```html
<!-- wp:group {"tagName":"section","className":"is-style-reveal","layout":{"type":"default"}} -->
<section class="wp-block-group is-style-reveal">
	...
</section>
<!-- /wp:group -->

<!-- wp:__SLUG__/site-info {"part":"contact","fontSize":"small"} /-->
```

- **The attributes in the comment must match the saved HTML.** Static core blocks are validated by re-running `save()` from the comment's attributes. If the HTML has a class, tag or attribute that the comment doesn't describe, the editor marks the block invalid.
  - `className` → listed in `class`.
  - `tagName` → the element name.
  - `fontSize: "small"` → `has-small-font-size`.
  - `backgroundColor`/`textColor` → `has-<slug>-background-color has-background` / `has-<slug>-color has-text-color`.
  - `ariaLabel` (Group) → `aria-label`.
- Class **order** doesn't matter; the set of classes does.
- Layout classes (`is-layout-flex`, `wp-container-*`) are added at render time. **Don't** write them into markup.
- Self-closing comments (`/-->`) are for blocks with no saved HTML: dynamic blocks, `wp:pattern`, `wp:template-part`, `wp:post-content`, `wp:navigation`, `wp:site-title`.
- JSON in comments must be valid. `--` can't appear inside it, because it would end the HTML comment.

### Use presets, not raw values

| Instead of | Use |
| --- | --- |
| `"style":{"color":{"text":"#1e293b"}}` | `"textColor":"primary"` |
| `"style":{"typography":{"fontSize":"18px"}}` | `"fontSize":"medium"` |
| `"style":{"spacing":{"padding":{"top":"40px"}}}` | `"style":{"spacing":{"padding":{"top":"var:preset\|spacing\|50"}}}` |

The presets available:
- **Colors:** `primary`, `secondary`, `tertiary`, `accent`, `light`, `white`.
- **Font sizes:** `x-small`, `small`, `medium`, `large`, `x-large`, `xx-large`, `huge`.
- **Spacing:** `10`=8px, `20`=16px, `30`=20px, `40`=24px, `50`=40px, `60`=60px.
- **Layout:** `contentSize`/`wideSize` are 1400px.

Inline `style` values are a last resort; prefer adding a preset to `theme.json`.

### Content blocks

- Text: `core/heading`, `core/paragraph`, `core/list` + `core/list-item`, `core/buttons` + `core/button`, `core/image`, `core/separator`.
- **Don't use `core/html` or `core/freeform` for content.** Editors can't edit them safely.
- Lists are `core/list` → one `core/list-item` per `<li>`. Lists are not paragraphs with line breaks.
- Wrap each page section in a `core/group` with `"tagName":"section"`, or in the **Section** block (`__SLUG__/section`) when you need the inner `.container` wrapper.
- Add `"className":"is-style-reveal"` to a Group or Separator to fade it in on scroll. This is the theme's "Reveal on scroll" block style. Don't add animation classes per element.
<!-- @pages-only -->
- Some blocks are removed by pages-only mode (`inc/pages-only.php`: `allowed_block_types_all`) and must not be used. These include `core/latest-posts`, `core/comments`, `core/post-author`, `core/post-terms`, `core/archives`, `core/categories`, `core/tag-cloud`, `core/rss`, `core/calendar` and `core/loginout`.
<!-- /@pages-only -->

### Patterns (`themes/__SLUG__/patterns/*.php`)

Header fields:

```php
<?php
/**
 * Title: Human-readable name
 * Slug: __SLUG__/<kebab-name>
 * Categories: __SLUG__
 * Description: One sentence on what it's for.
 *
 * @package __SLUG__
 */

?>
```

- **Don't create full-page patterns** (`Block Types: core/post-content`) unless the user asks. WordPress shows every full-page pattern in a "Choose a pattern" screen whenever a page is added, and they were removed from this site for that reason. Build section patterns instead.
- **Patterns used only by template parts:** add `Inserter: no` (e.g. `header`, `footer`).
- **PHP in patterns runs once, when the pattern is inserted** (or once per request while a template part is unedited). After someone edits that template in the Site Editor, the output is frozen as static HTML. So:
  - Use PHP only for values that are fine to freeze: `get_theme_file_uri()` image paths, translated strings, the site name in starter content.
  - For values that must stay current (Site Settings, the year, menu lookups), use a **dynamic block**: the Site Info block, or a new one.
- Escape PHP output in patterns exactly as in render.php, and prefix PHP variables with `$__PREFIX___`.
- Template parts (`parts/*.html`) contain only `<!-- wp:pattern {"slug":"__SLUG__/<name>"} /-->` so their markup lives in a PHP pattern.

### Templates (`templates/*.html`)

- Every template is header part → `<main>` group → footer part:

```html
<!-- wp:template-part {"slug":"header","tagName":"header"} /-->
<!-- wp:group {"tagName":"main","className":"site-main","layout":{"type":"constrained"}} -->
<main class="wp-block-group site-main">...</main>
<!-- /wp:group -->
<!-- wp:template-part {"slug":"footer","tagName":"footer"} /-->
```
- Keep exactly one `<main>`. Core's skip link targets it, and the theme moves focus onto it.
- `page.html` outputs `post-title` as the `<h1>`. `front-page.html` and `page-no-title.html` don't, because their content starts with its own `<h1>`.

### Menus

- The header's Navigation block uses the `wp_navigation` post with the slug `main-menu`, found by slug in `patterns/header.php`. Never hardcode a `ref` ID: it differs on every site and every database.
- Edit menu items in Appearance → Editor → Navigation, not in code.

## Site-wide values

To add an editable site-wide value (header CTA, opening hours, an extra social network):
1. Add a field to `__PREFIX___site_settings_fields()` in `inc/site-settings.php`, under the right section. If none of the existing types fit, add a `case` to `__PREFIX___site_settings_sanitize()`. Existing types: `text`, `email`, `url`, `gtm`, `verification`, `code`.
2. Read it with `__PREFIX___site_setting( 'key' )`.
3. Show it on the front end with a dynamic block. Extend Site Info's `part` enum and `render.php`, or create a new block. Don't use PHP in a pattern (see above).

## Before you finish

Run these in `build_tools/` (and `composer lint` at the repo root). All must pass:

```bash
npm run build          # Vite theme assets + wp-scripts blocks
npm run lint:js        # ESLint (WordPress config, jsx-a11y)
npm run lint:css       # Stylelint (WordPress SCSS + BEM)
composer lint          # PHPCS: WordPress Coding Standards + PHP 8.1+ compatibility (repo root)
npm run test:a11y      # axe-core WCAG 2.2 AA + keyboard checks (site must be running)
```

- Many ESLint/Stylelint errors are formatting; `npx wp-scripts lint-js src tests --fix` and `npx wp-scripts lint-style "src/**/*.scss" --fix` handle those.
- **Open the block or pattern in the editor** and confirm there's no "unexpected or invalid content" warning. Lint can't catch invalid markup. Also confirm the front end renders correctly with JavaScript disabled.
- For a new block, insert it on a draft page at desktop and mobile widths, then delete the draft.
- Check `docker compose logs wordpress` for PHP warnings (WP_DEBUG is on locally).
- Confirm the block has its inner `.container` on the front end and in the editor.
- Mention the new block or pattern in `README.md` under Architecture.
