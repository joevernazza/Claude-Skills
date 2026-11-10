<?php
/**
 * Pages-only site: disables the "post" post type, its taxonomies, and all
 * comment/pingback functionality, in the admin and on the front end.
 *
 * Nothing is deleted from the database; this only hides and blocks.
 *
 * @package __SLUG__
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// -------------------------------------------------------------------------
// Posts
// -------------------------------------------------------------------------

/**
 * Makes the built-in "post" type private and hidden everywhere.
 * show_in_rest stays on so the block/site editor (which expects the post
 * entity to exist) keeps working.
 *
 * @param array  $args      Post type registration args.
 * @param string $post_type Post type name.
 * @return array
 */
function __PREFIX___hide_post_type( $args, $post_type ) {
	if ( 'post' !== $post_type ) {
		return $args;
	}

	return array_merge(
		$args,
		array(
			'public'              => false,
			'publicly_queryable'  => false,
			'exclude_from_search' => true,
			'show_ui'             => false,
			'show_in_menu'        => false,
			'show_in_nav_menus'   => false,
			'show_in_admin_bar'   => false,
			'has_archive'         => false,
			'supports'            => array( 'title', 'editor' ),
		)
	);
}
add_filter( 'register_post_type_args', '__PREFIX___hide_post_type', 10, 2 );

/**
 * Detaches categories and tags from posts, so they drop out of the admin
 * menu, nav menu screens and sitemaps.
 *
 * @return void
 */
function __PREFIX___pages_only_setup() {
	unregister_taxonomy_for_object_type( 'category', 'post' );
	unregister_taxonomy_for_object_type( 'post_tag', 'post' );
	remove_theme_support( 'post-formats' );
}
add_action( 'init', '__PREFIX___pages_only_setup', 20 );

/**
 * Sends anything blog-shaped on the front end (single posts, category/tag/
 * author/date archives, the posts page, and every feed) to the homepage.
 *
 * @return void
 */
function __PREFIX___redirect_blog_requests() {
	if (
		is_singular( 'post' )
		|| is_category()
		|| is_tag()
		|| is_author()
		|| is_date()
		|| is_feed()
		|| ( is_home() && ! is_front_page() )
	) {
		wp_safe_redirect( home_url( '/' ), 301 );
		exit;
	}
}
// Priority 1: before core's redirect_canonical() (priority 10), which would
// otherwise first send /?author=1 to /author/<username>/ and leak the login.
add_action( 'template_redirect', '__PREFIX___redirect_blog_requests', 1 );

/**
 * Front-end main query: search only returns pages, and the blog index
 * (homepage while Settings > Reading is "Your latest posts") returns nothing.
 *
 * @param WP_Query $query The query.
 * @return void
 */
function __PREFIX___pages_only_main_query( $query ) {
	if ( is_admin() || ! $query->is_main_query() ) {
		return;
	}

	if ( $query->is_search() ) {
		$query->set( 'post_type', 'page' );
	} elseif ( $query->is_home() ) {
		$query->set( 'post__in', array( 0 ) );
	}
}
add_action( 'pre_get_posts', '__PREFIX___pages_only_main_query' );

/**
 * Query Loop blocks that ask for posts return nothing instead.
 *
 * @param array $query Query vars for the Query Loop block.
 * @return array
 */
function __PREFIX___query_loop_no_posts( $query ) {
	if ( empty( $query['post_type'] ) || in_array( 'post', (array) $query['post_type'], true ) ) {
		$query['post__in'] = array( 0 );
	}
	return $query;
}
add_filter( 'query_loop_block_query_vars', '__PREFIX___query_loop_no_posts' );

/**
 * Removes posts from wp-sitemap.xml.
 *
 * @param array $post_types Post type objects keyed by name.
 * @return array
 */
function __PREFIX___sitemap_post_types( $post_types ) {
	unset( $post_types['post'] );
	return $post_types;
}
add_filter( 'wp_sitemaps_post_types', '__PREFIX___sitemap_post_types' );

/**
 * Removes categories and tags from wp-sitemap.xml.
 *
 * @param array $taxonomies Taxonomy objects keyed by name.
 * @return array
 */
function __PREFIX___sitemap_taxonomies( $taxonomies ) {
	unset( $taxonomies['category'], $taxonomies['post_tag'] );
	return $taxonomies;
}
add_filter( 'wp_sitemaps_taxonomies', '__PREFIX___sitemap_taxonomies' );

/**
 * Removes the users (author archives) provider from wp-sitemap.xml.
 *
 * @param WP_Sitemaps_Provider|false $provider Provider instance.
 * @param string                     $name     Provider name.
 * @return WP_Sitemaps_Provider|false
 */
function __PREFIX___sitemap_providers( $provider, $name ) {
	return 'users' === $name ? false : $provider;
}
add_filter( 'wp_sitemaps_add_provider', '__PREFIX___sitemap_providers', 10, 2 );

// No feed <link> tags in <head>.
remove_action( 'wp_head', 'feed_links', 2 );
remove_action( 'wp_head', 'feed_links_extra', 3 );

// -------------------------------------------------------------------------
// Comments, pingbacks & trackbacks
// -------------------------------------------------------------------------

/**
 * Removes comment and trackback support from every post type.
 *
 * @return void
 */
function __PREFIX___remove_comment_support() {
	foreach ( get_post_types() as $post_type ) {
		if ( post_type_supports( $post_type, 'comments' ) ) {
			remove_post_type_support( $post_type, 'comments' );
			remove_post_type_support( $post_type, 'trackbacks' );
		}
	}
}
add_action( 'init', '__PREFIX___remove_comment_support', 100 );

// Close comments and pings everywhere (also blocks REST/XML-RPC submissions).
add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );

// Hide any comments that already exist.
add_filter( 'comments_array', '__return_empty_array', 20 );
add_filter( 'get_comments_number', '__return_zero', 20 );

// -------------------------------------------------------------------------
// Admin
// -------------------------------------------------------------------------

/**
 * Removes Posts, Comments and Settings > Discussion from the admin menu.
 *
 * @return void
 */
function __PREFIX___pages_only_admin_menu() {
	remove_menu_page( 'edit.php' );
	remove_menu_page( 'edit-comments.php' );
	remove_submenu_page( 'options-general.php', 'options-discussion.php' );
}
add_action( 'admin_menu', '__PREFIX___pages_only_admin_menu', 999 );

/**
 * Redirects direct visits to the post/comment admin screens to the dashboard.
 *
 * @return void
 */
function __PREFIX___pages_only_admin_redirects() {
	global $pagenow;

	// phpcs:disable WordPress.Security.NonceVerification.Recommended -- read-only routing check.
	$post_type = isset( $_GET['post_type'] ) ? sanitize_key( wp_unslash( $_GET['post_type'] ) ) : 'post';
	$taxonomy  = isset( $_GET['taxonomy'] ) ? sanitize_key( wp_unslash( $_GET['taxonomy'] ) ) : '';
	// phpcs:enable

	$blocked = ( in_array( $pagenow, array( 'edit.php', 'post-new.php' ), true ) && 'post' === $post_type )
		|| ( in_array( $pagenow, array( 'edit-tags.php', 'term.php' ), true ) && in_array( $taxonomy, array( 'category', 'post_tag' ), true ) )
		|| in_array( $pagenow, array( 'edit-comments.php', 'comment.php', 'options-discussion.php' ), true );

	if ( $blocked ) {
		wp_safe_redirect( admin_url() );
		exit;
	}
}
add_action( 'admin_init', '__PREFIX___pages_only_admin_redirects' );

/**
 * Removes the post/comment dashboard widgets.
 *
 * @return void
 */
function __PREFIX___pages_only_dashboard() {
	remove_meta_box( 'dashboard_quick_press', 'dashboard', 'side' );
	remove_meta_box( 'dashboard_recent_comments', 'dashboard', 'normal' );
	remove_meta_box( 'dashboard_activity', 'dashboard', 'normal' );
}
add_action( 'wp_dashboard_setup', '__PREFIX___pages_only_dashboard' );

/**
 * Admin bar: removes "New Post" and the comments bubble, and points "+ New"
 * at a new page.
 *
 * @param WP_Admin_Bar $wp_admin_bar Admin bar instance.
 * @return void
 */
function __PREFIX___pages_only_admin_bar( $wp_admin_bar ) {
	$wp_admin_bar->remove_node( 'new-post' );
	$wp_admin_bar->remove_node( 'comments' );

	$node = $wp_admin_bar->get_node( 'new-content' );
	if ( $node ) {
		$node->href = admin_url( 'post-new.php?post_type=page' );
		$wp_admin_bar->add_node( (array) $node );
	}
}
add_action( 'admin_bar_menu', '__PREFIX___pages_only_admin_bar', 999 );

/**
 * Removes blocks that only make sense with posts or comments from the inserter.
 *
 * @param bool|string[] $allowed Allowed block names, or true for all.
 * @return bool|string[]
 */
function __PREFIX___pages_only_allowed_blocks( $allowed ) {
	$blocked = array(
		'core/latest-posts',
		'core/latest-comments',
		'core/archives',
		'core/categories',
		'core/tag-cloud',
		'core/rss',
		'core/calendar',
		'core/comments',
		'core/post-comments-form',
		'core/comments-title',
		'core/comment-template',
		'core/comments-pagination',
		'core/post-author',
		'core/post-author-name',
		'core/post-author-biography',
		'core/post-terms',
		'core/post-navigation-link',
		'core/avatar',
		'core/loginout',
	);

	if ( true === $allowed ) {
		$allowed = array_keys( WP_Block_Type_Registry::get_instance()->get_all_registered() );
	}

	return is_array( $allowed ) ? array_values( array_diff( $allowed, $blocked ) ) : $allowed;
}
add_filter( 'allowed_block_types_all', '__PREFIX___pages_only_allowed_blocks' );
