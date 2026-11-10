<?php
/**
 * Google Tag Manager, output on production only (and only when a container
 * ID is set).
 *
 * The container ID comes from Settings > Site Settings > Head. A constant in
 * wp-config.php overrides it (an empty string turns analytics off):
 *     define( '__PREFIX_UPPER___GTM_ID', 'GTM-XXXXXXX' );
 *
 * @package __SLUG__
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Returns the GTM container ID when analytics should load, otherwise ''.
 *
 * @return string
 */
function __PREFIX___gtm_id() {
	if ( 'production' !== wp_get_environment_type() ) {
		return '';
	}
	$id = defined( '__PREFIX_UPPER___GTM_ID' ) ? (string) __PREFIX_UPPER___GTM_ID : __PREFIX___site_setting( 'gtm_id' );
	return preg_match( '/^GTM-[A-Z0-9]+$/', $id ) ? $id : '';
}

/**
 * Prints the GTM loader in <head>.
 *
 * @return void
 */
function __PREFIX___gtm_head() {
	$id = __PREFIX___gtm_id();
	if ( ! $id ) {
		return;
	}
	wp_print_inline_script_tag(
		sprintf(
			"(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',%s);",
			wp_json_encode( $id )
		)
	);
}
add_action( 'wp_head', '__PREFIX___gtm_head', 1 );

/**
 * Prints the GTM <noscript> fallback right after <body>.
 *
 * @return void
 */
function __PREFIX___gtm_body() {
	$id = __PREFIX___gtm_id();
	if ( ! $id ) {
		return;
	}
	printf(
		'<noscript><iframe src="%s" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>',
		esc_url( 'https://www.googletagmanager.com/ns.html?id=' . $id )
	);
}
add_action( 'wp_body_open', '__PREFIX___gtm_body' );
