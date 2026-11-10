<?php
// wp eval-file create-menu.php <page-id> [<page-id> ...]
// Creates (or replaces) the "Main" navigation menu (wp_navigation post with
// the slug "main-menu") linking the given pages in order. The theme's header
// pattern looks the menu up by that slug.
$links = array();
foreach ( $args as $id ) {
	$page = get_post( (int) $id );
	if ( ! $page || 'page' !== $page->post_type ) {
		WP_CLI::error( "Not a page: $id" );
	}
	$links[] = serialize_block(
		array(
			'blockName'    => 'core/navigation-link',
			'attrs'        => array(
				'label' => $page->post_title,
				'type'  => 'page',
				'id'    => $page->ID,
				'url'   => get_permalink( $page ),
				'kind'  => 'post-type',
			),
			'innerBlocks'  => array(),
			'innerHTML'    => '',
			'innerContent' => array(),
		)
	);
}

$existing = get_posts( array( 'post_type' => 'wp_navigation', 'name' => 'main-menu', 'post_status' => 'any', 'numberposts' => 1 ) );
$menu     = array(
	'post_type'    => 'wp_navigation',
	'post_title'   => 'Main',
	'post_name'    => 'main-menu',
	'post_status'  => 'publish',
	'post_content' => implode( "\n", $links ),
);
if ( $existing ) {
	$menu['ID'] = $existing[0]->ID;
}
$id = wp_insert_post( wp_slash( $menu ), true );
if ( is_wp_error( $id ) ) {
	WP_CLI::error( $id->get_error_message() );
}
echo $id;
