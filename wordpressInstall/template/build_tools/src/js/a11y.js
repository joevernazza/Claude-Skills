/**
 * Moves keyboard focus to the skip link's target.
 *
 * Core's "Skip to content" link only scrolls to <main>; since <main> isn't
 * focusable, focus stays on <body> and some screen readers don't announce
 * the jump. Making the target programmatically focusable (tabindex="-1")
 * and focusing it fixes that. Delegated, so it also covers the skip link
 * core injects after this script runs.
 */
export function initSkipLinkFocus() {
	document.addEventListener( 'click', ( event ) => {
		const link = event.target.closest( 'a.skip-link[href^="#"]' );
		const target =
			link &&
			document.getElementById( link.getAttribute( 'href' ).slice( 1 ) );
		if ( ! target ) {
			return;
		}
		if ( ! target.hasAttribute( 'tabindex' ) ) {
			target.setAttribute( 'tabindex', '-1' );
		}
		event.preventDefault();
		target.focus();
		target.scrollIntoView( { block: 'start' } );
		window.history.replaceState( null, '', link.getAttribute( 'href' ) );
	} );
}
