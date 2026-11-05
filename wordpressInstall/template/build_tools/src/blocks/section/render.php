<?php
/**
 * Server render for __SLUG__/section.
 *
 * Outputs <section> (with the block's anchor id and extra classes from the
 * Advanced panel) and an inner .container around the inner blocks.
 *
 * @package __SLUG__
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var WP_Block $block      Block instance.
 */

if ( '' === trim( $content ) ) {
	return;
}
?>
<section <?php echo get_block_wrapper_attributes(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped by core. ?>>
	<div class="container">
		<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered inner blocks. ?>
	</div>
</section>
