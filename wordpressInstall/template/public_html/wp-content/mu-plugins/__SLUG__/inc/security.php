<?php
/**
 * Security hardening that doesn't depend on server config.
 * Environment-specific settings (debug, SSL, salts) belong in wp-config.php;
 * see config/wp-config-production.sample.php in the repo.
 *
 * @package __SLUG__
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Code ships through git deploys, never the wp-admin theme/plugin editors.
if ( ! defined( 'DISALLOW_FILE_EDIT' ) ) {
	define( 'DISALLOW_FILE_EDIT', true ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound -- core constant.
}

/* XML-RPC: not used (no remote publishing, no pingbacks). */
add_filter( 'xmlrpc_enabled', '__return_false' );
add_filter( 'xmlrpc_methods', '__return_empty_array' );

/**
 * Drops the X-Pingback header.
 *
 * @param array $headers Response headers.
 * @return array
 */
function __PREFIX___remove_pingback_header( $headers ) {
	unset( $headers['X-Pingback'] );
	return $headers;
}
add_filter( 'wp_headers', '__PREFIX___remove_pingback_header' );

// No RSD link or WordPress version in <head>/feeds.
remove_action( 'wp_head', 'rsd_link' );
remove_action( 'wp_head', 'wp_generator' );
add_filter( 'the_generator', '__return_empty_string' );

/**
 * Hides the REST users endpoints from logged-out visitors (prevents username
 * enumeration via /wp-json/wp/v2/users).
 *
 * @param array $endpoints Registered REST routes.
 * @return array
 */
function __PREFIX___hide_rest_users( $endpoints ) {
	if ( is_user_logged_in() ) {
		return $endpoints;
	}
	foreach ( array_keys( $endpoints ) as $route ) {
		if ( str_starts_with( $route, '/wp/v2/users' ) ) {
			unset( $endpoints[ $route ] );
		}
	}
	return $endpoints;
}
add_filter( 'rest_endpoints', '__PREFIX___hide_rest_users' );

/**
 * Same message for a wrong username or a wrong password, so the login form
 * doesn't confirm which usernames exist.
 *
 * @return string
 */
function __PREFIX___generic_login_error() {
	return esc_html__( 'Incorrect username or password.', '__SLUG__' );
}
add_filter( 'login_errors', '__PREFIX___generic_login_error' );

/**
 * Baseline security headers on front-end responses.
 *
 * @param array $headers Response headers.
 * @return array
 */
function __PREFIX___security_headers( $headers ) {
	$headers['X-Content-Type-Options'] = 'nosniff';
	$headers['X-Frame-Options']        = 'SAMEORIGIN';
	$headers['Referrer-Policy']        = 'strict-origin-when-cross-origin';
	$headers['Permissions-Policy']     = 'camera=(), microphone=(), geolocation=()';
	return $headers;
}
add_filter( 'wp_headers', '__PREFIX___security_headers' );
