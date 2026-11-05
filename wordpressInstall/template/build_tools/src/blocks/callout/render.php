<?php
/**
 * Server render for __SLUG__/callout.
 *
 * @package __SLUG__
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks.
 * @var WP_Block $block      Block instance.
 */

$__PREFIX___title = $attributes['title'] ?? '';
?>
<aside <?php echo get_block_wrapper_attributes( array( 'class' => 'callout' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by core. ?>>
	<div class="container">
		<?php if ( $__PREFIX___title ) : ?>
			<h2 class="callout__title"><?php echo wp_kses_post( $__PREFIX___title ); ?></h2>
		<?php endif; ?>
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered inner blocks. ?>
	</div>
</aside>
