<?php
/**
 * Title: Hero
 * Slug: __SLUG__/hero
 * Categories: __SLUG__
 * Description: Large page heading with an intro line.
 *
 * @package __SLUG__
 */

?>
<!-- wp:group {"tagName":"section","className":"is-style-reveal hero","layout":{"type":"default"}} -->
<section class="wp-block-group is-style-reveal hero">
	<!-- wp:heading {"level":1} -->
	<h1 class="wp-block-heading"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></h1>
	<!-- /wp:heading -->

	<!-- wp:paragraph {"className":"hero__subtitle","fontSize":"xx-large"} -->
	<p class="hero__subtitle has-xx-large-font-size"><?php echo esc_html( get_bloginfo( 'description' ) ); ?></p>
	<!-- /wp:paragraph -->
</section>
<!-- /wp:group -->
