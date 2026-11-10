<?php
/**
 * Registers the custom blocks built by @wordpress/scripts into ../blocks/.
 *
 * @package __SLUG__
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers every built block (each folder in blocks/ with a block.json).
 * Silently skips when the build hasn't been run yet.
 *
 * @return void
 */
function __PREFIX___register_blocks() {
	$manifests = glob( __PREFIX_UPPER___SITE_DIR . '/blocks/*/block.json' );

	foreach ( (array) $manifests as $manifest ) {
		register_block_type( dirname( $manifest ) );
	}
}
add_action( 'init', '__PREFIX___register_blocks' );
