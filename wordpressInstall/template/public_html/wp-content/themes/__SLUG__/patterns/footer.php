<?php
/**
 * Title: Footer
 * Slug: __SLUG__/footer
 * Inserter: no
 * Description: Copyright, footer text, contact details, social links and footer links, used by the footer template part.
 * Footer values come from Settings > Site Settings via the Site Info block.
 *
 * @package __SLUG__
 */

$__PREFIX___a11y_page = get_page_by_path( 'accessibility' );
$__PREFIX___links     = array();
if ( $__PREFIX___a11y_page && 'publish' === $__PREFIX___a11y_page->post_status ) {
	$__PREFIX___links[] = sprintf( '<a href="%s">%s</a>', esc_url( get_permalink( $__PREFIX___a11y_page ) ), esc_html__( 'Accessibility', '__SLUG__' ) );
}
if ( get_privacy_policy_url() ) {
	$__PREFIX___links[] = sprintf( '<a href="%s">%s</a>', esc_url( get_privacy_policy_url() ), esc_html__( 'Privacy Policy', '__SLUG__' ) );
}
?>
<!-- wp:group {"className":"site-footer","backgroundColor":"primary","textColor":"white","layout":{"type":"constrained"}} -->
<div class="wp-block-group site-footer has-white-color has-primary-background-color has-text-color has-background">
	<!-- wp:group {"className":"site-footer__inner","layout":{"type":"flex","flexWrap":"wrap","justifyContent":"space-between","verticalAlignment":"top"}} -->
	<div class="wp-block-group site-footer__inner">
		<!-- wp:group {"className":"site-footer__brand","layout":{"type":"flex","orientation":"vertical"}} -->
		<div class="wp-block-group site-footer__brand">
			<!-- wp:paragraph {"fontSize":"small"} -->
			<p class="has-small-font-size">&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php echo esc_html( get_bloginfo( 'name' ) ); ?></p>
			<!-- /wp:paragraph -->

			<!-- wp:__SLUG__/site-info {"part":"footer-text","fontSize":"small"} /-->
		</div>
		<!-- /wp:group -->

		<!-- wp:group {"className":"site-footer__meta","layout":{"type":"flex","orientation":"vertical"}} -->
		<div class="wp-block-group site-footer__meta">
			<!-- wp:__SLUG__/site-info {"part":"contact","fontSize":"small"} /-->

			<!-- wp:__SLUG__/site-info {"part":"social","fontSize":"small"} /-->

			<?php if ( $__PREFIX___links ) : ?>
			<!-- wp:paragraph {"className":"site-footer__links","fontSize":"small"} -->
			<p class="site-footer__links has-small-font-size"><?php echo wp_kses_post( implode( ' <span aria-hidden="true">·</span> ', $__PREFIX___links ) ); ?></p>
			<!-- /wp:paragraph -->
			<?php endif; ?>
		</div>
		<!-- /wp:group -->
	</div>
	<!-- /wp:group -->
</div>
<!-- /wp:group -->
