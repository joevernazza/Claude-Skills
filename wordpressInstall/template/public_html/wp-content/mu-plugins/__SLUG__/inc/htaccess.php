<?php
/**
 * Browser caching and compression rules, written to .htaccess between
 * "# BEGIN __SLUG__-caching" markers (the same mechanism core uses for its
 * rewrite rules). Re-written whenever __PREFIX_UPPER___HTACCESS_VERSION changes.
 *
 * Theme/plugin assets are versioned with ?ver=<filemtime>, so long cache
 * lifetimes are safe: every deploy changes the URL.
 *
 * Works on Apache and LiteSpeed (most shared hosting). Does nothing if
 * .htaccess isn't writable.
 *
 * @package __SLUG__
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const __PREFIX_UPPER___HTACCESS_VERSION = '1';

/**
 * Caching and compression directives.
 *
 * @return string[]
 */
function __PREFIX___htaccess_rules() {
	return array(
		'<IfModule mod_expires.c>',
		'	ExpiresActive On',
		'	ExpiresDefault "access plus 0 seconds"',
		'	ExpiresByType text/css "access plus 1 year"',
		'	ExpiresByType application/javascript "access plus 1 year"',
		'	ExpiresByType text/javascript "access plus 1 year"',
		'	ExpiresByType font/woff2 "access plus 1 year"',
		'	ExpiresByType image/svg+xml "access plus 1 month"',
		'	ExpiresByType image/png "access plus 1 month"',
		'	ExpiresByType image/jpeg "access plus 1 month"',
		'	ExpiresByType image/webp "access plus 1 month"',
		'	ExpiresByType image/avif "access plus 1 month"',
		'	ExpiresByType application/pdf "access plus 1 day"',
		'</IfModule>',
		'<IfModule mod_deflate.c>',
		'	AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript text/javascript application/json application/ld+json image/svg+xml',
		'</IfModule>',
	);
}

/**
 * Writes the rules once per version, from wp-admin.
 *
 * @return void
 */
function __PREFIX___maybe_write_htaccess() {
	if ( get_option( '__PREFIX___htaccess_version' ) === __PREFIX_UPPER___HTACCESS_VERSION ) {
		return;
	}

	require_once ABSPATH . 'wp-admin/includes/misc.php';
	require_once ABSPATH . 'wp-admin/includes/file.php';

	$file = get_home_path() . '.htaccess';
	if ( ! got_mod_rewrite() || ! wp_is_writable( file_exists( $file ) ? $file : get_home_path() ) ) {
		return;
	}

	if ( insert_with_markers( $file, '__SLUG__-caching', __PREFIX___htaccess_rules() ) ) {
		update_option( '__PREFIX___htaccess_version', __PREFIX_UPPER___HTACCESS_VERSION, false );
	}
}
add_action( 'admin_init', '__PREFIX___maybe_write_htaccess' );
