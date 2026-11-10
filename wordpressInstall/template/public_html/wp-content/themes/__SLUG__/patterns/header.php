<?php
/**
 * Title: Header
 * Slug: __SLUG__/header
 * Inserter: no
 * Description: Site title and the main menu, used by the header template part.
 *
 * The Navigation block is pointed at the "Main" menu (a wp_navigation post
 * with the slug "main-menu") when it exists, so the menu is editable in
 * Appearance > Editor > Navigation. Without it, core falls back to a list of
 * pages.
 *
 * @package __SLUG__
 */

$__PREFIX___menu = get_posts(
	array(
		'post_type'      => 'wp_navigation',
		'name'           => 'main-menu',
		'post_status'    => 'publish',
		'posts_per_page' => 1,
		'fields'         => 'ids',
	)
);

$__PREFIX___nav = array(
	'ariaLabel'   => __( 'Main', '__SLUG__' ),
	'overlayMenu' => 'mobile',
	'className'   => 'site-nav',
	'layout'      => array(
		'type'           => 'flex',
		'justifyContent' => 'right',
	),
);
if ( $__PREFIX___menu ) {
	$__PREFIX___nav = array( 'ref' => (int) $__PREFIX___menu[0] ) + $__PREFIX___nav;
}
?>
<!-- wp:group {"className":"site-header","layout":{"type":"constrained"}} -->
<div class="wp-block-group site-header">
	<!-- wp:group {"className":"site-header__inner","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between"}} -->
	<div class="wp-block-group site-header__inner">
		<!-- wp:site-title {"level":0} /-->

		<!-- wp:navigation <?php echo wp_json_encode( $__PREFIX___nav ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- JSON block attributes from fixed values and an integer ID. ?> /-->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
