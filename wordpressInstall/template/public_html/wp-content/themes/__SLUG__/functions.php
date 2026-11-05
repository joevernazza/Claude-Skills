<?php
/**
 * __SITE_NAME__ theme: setup, assets, block styles and pattern categories.
 *
 * Presentation only. Site behavior (SEO, security, analytics, custom
 * blocks) lives in the __SLUG__ must-use plugin.
 *
 * @package __SLUG__
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Theme supports and editor styles.
 *
 * @return void
 */
function __PREFIX___setup() {
	add_theme_support( 'editor-styles' );
	add_editor_style( 'assets/css/main.css' );

	// Only this theme's own patterns; no core or remote pattern directory.
	remove_theme_support( 'core-block-patterns' );
}
add_action( 'after_setup_theme', '__PREFIX___setup' );
add_filter( 'should_load_remote_block_patterns', '__return_false' );

/**
 * Returns a cache-busting version for a theme file (its modification time).
 *
 * @param string $file Path relative to the theme root.
 * @return string|false Version string, or false when the file is missing.
 */
function __PREFIX___asset_version( $file ) {
	$path = get_theme_file_path( $file );
	return file_exists( $path ) ? (string) filemtime( $path ) : false;
}

/**
 * Enqueues the Vite build output (built from /build_tools into assets/).
 *
 * @return void
 */
function __PREFIX___enqueue_assets() {
	$css_version = __PREFIX___asset_version( 'assets/css/main.css' );
	if ( $css_version ) {
		wp_enqueue_style( '__SLUG__-main', get_theme_file_uri( 'assets/css/main.css' ), array(), $css_version );
	}

	$js_version = __PREFIX___asset_version( 'assets/js/main.js' );
	if ( $js_version ) {
		wp_enqueue_script(
			'__SLUG__-main',
			get_theme_file_uri( 'assets/js/main.js' ),
			array(),
			$js_version,
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);
	}
}
add_action( 'wp_enqueue_scripts', '__PREFIX___enqueue_assets' );

/**
 * Adds a `js` class to <html> before first paint, so reveal-on-scroll
 * content is only hidden when JavaScript is running.
 *
 * @return void
 */
function __PREFIX___js_class() {
	wp_print_inline_script_tag( "document.documentElement.classList.add('js');" );
}
add_action( 'wp_head', '__PREFIX___js_class', 0 );

/**
 * Falls back to the theme's SVG favicon until a Site Icon is set in the
 * Site Editor.
 *
 * @return void
 */
function __PREFIX___favicon() {
	if ( has_site_icon() ) {
		return;
	}
	printf(
		'<link rel="icon" href="%s" type="image/svg+xml">' . "\n",
		esc_url( get_theme_file_uri( 'assets/images/favicon.svg' ) )
	);
}
add_action( 'wp_head', '__PREFIX___favicon' );

/**
 * Registers the "Reveal on scroll" block style. Content inside a revealed
 * Group (and revealed Separators) fades in as it enters the viewport; see
 * build_tools/src/js/animate.js.
 *
 * @return void
 */
function __PREFIX___block_styles() {
	register_block_style(
		array( 'core/group', 'core/separator' ),
		array(
			'name'  => 'reveal',
			'label' => __( 'Reveal on scroll', '__SLUG__' ),
		)
	);
}
add_action( 'init', '__PREFIX___block_styles' );

/**
 * Registers the pattern category for the theme's section and page patterns.
 *
 * @return void
 */
function __PREFIX___pattern_categories() {
	register_block_pattern_category(
		'__SLUG__',
		array(
			'label'       => __( '__SITE_NAME__', '__SLUG__' ),
			'description' => __( 'Page sections and full-page layouts.', '__SLUG__' ),
		)
	);
}
add_action( 'init', '__PREFIX___pattern_categories' );
