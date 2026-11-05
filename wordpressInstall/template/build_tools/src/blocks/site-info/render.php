<?php
/**
 * Server render for __SLUG__/site-info: values from Settings > Site Settings.
 *
 * @package __SLUG__
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused.
 * @var WP_Block $block      Block instance.
 */

$__PREFIX___part   = $attributes['part'] ?? 'contact';
$__PREFIX___editor = wp_is_serving_rest_request(); // ServerSideRender preview.
$__PREFIX___html   = '';

if ( 'footer-text' === $__PREFIX___part ) {
	$__PREFIX___text = __PREFIX___site_setting( 'footer_text', get_bloginfo( 'description' ) );
	if ( $__PREFIX___text ) {
		$__PREFIX___html = sprintf( '<p class="site-info site-info--text">%s</p>', esc_html( $__PREFIX___text ) );
	}
} elseif ( 'contact' === $__PREFIX___part ) {
	$__PREFIX___items = array();
	$__PREFIX___email = __PREFIX___site_setting( 'contact_email' );
	$__PREFIX___phone = __PREFIX___site_setting( 'contact_phone' );
	$__PREFIX___place = __PREFIX___site_setting( 'contact_location' );
	if ( $__PREFIX___place ) {
		$__PREFIX___items[] = esc_html( $__PREFIX___place );
	}
	if ( $__PREFIX___email ) {
		$__PREFIX___items[] = sprintf( '<a href="%s">%s</a>', esc_url( 'mailto:' . $__PREFIX___email ), esc_html( $__PREFIX___email ) );
	}
	if ( $__PREFIX___phone ) {
		$__PREFIX___tel     = preg_replace( '/[^0-9+]/', '', $__PREFIX___phone );
		$__PREFIX___items[] = sprintf( '<a href="%s">%s</a>', esc_url( 'tel:' . $__PREFIX___tel, array( 'tel' ) ), esc_html( $__PREFIX___phone ) );
	}
	if ( $__PREFIX___items ) {
		$__PREFIX___html = sprintf(
			'<p class="site-info site-info--contact">%s</p>',
			implode( ' <span aria-hidden="true">·</span> ', $__PREFIX___items )
		);
	}
} elseif ( 'social' === $__PREFIX___part ) {
	$__PREFIX___networks = array(
		'social_linkedin'  => 'LinkedIn',
		'social_github'    => 'GitHub',
		'social_instagram' => 'Instagram',
		'social_facebook'  => 'Facebook',
		'social_x'         => 'X',
		'social_youtube'   => 'YouTube',
	);
	$__PREFIX___links    = '';
	foreach ( $__PREFIX___networks as $__PREFIX___key => $__PREFIX___label ) {
		$__PREFIX___url = __PREFIX___site_setting( $__PREFIX___key );
		if ( $__PREFIX___url ) {
			$__PREFIX___links .= sprintf( '<li><a href="%s" rel="me noopener">%s</a></li>', esc_url( $__PREFIX___url ), esc_html( $__PREFIX___label ) );
		}
	}
	if ( $__PREFIX___links ) {
		$__PREFIX___html = sprintf(
			'<ul class="site-info site-info--social" aria-label="%s">%s</ul>',
			esc_attr__( 'Social media', '__SLUG__' ),
			$__PREFIX___links
		);
	}
}

if ( ! $__PREFIX___html && $__PREFIX___editor ) {
	$__PREFIX___html = sprintf(
		'<p class="site-info site-info--empty"><em>%s</em></p>',
		esc_html__( 'Nothing to show yet. Add values in Settings > Site Settings.', '__SLUG__' )
	);
}

if ( $__PREFIX___html ) {
	// Outer element carries the block supports (font size, colors, margin);
	// the existing site-info classes stay on the <p>/<ul> inside the container.
	printf(
		'<div %s><div class="container">%s</div></div>',
		get_block_wrapper_attributes(), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by core.
		$__PREFIX___html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value escaped above.
	);
}
