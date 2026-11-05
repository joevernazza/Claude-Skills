import '../scss/style.scss';
import 'lenis/dist/lenis.css';
import Lenis from 'lenis';
import { initAnimations } from './animate.js';
import { initSkipLinkFocus } from './a11y.js';

// Smooth (momentum) wheel scrolling. Skipped for reduced-motion users.
// Touch devices keep native scrolling (Lenis default).
if ( ! window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
	new Lenis( {
		autoRaf: true, // Lenis runs its own requestAnimationFrame loop
		lerp: 0.1, // lower = smoother/floatier (0.05–0.15 typical)
	} );
}

// Keep in sync with the selector in src/scss/global/_animate.scss.
const REVEAL_SELECTOR = [
	'.animate',
	'.is-style-reveal :is(h1, h2, h3, h4, h5, h6, p, li)',
	'.wp-block-separator.is-style-reveal',
].join( ', ' );

initAnimations( { selector: REVEAL_SELECTOR } );
initSkipLinkFocus();
