/**
 * Scroll-reveal engine for CSS animations.
 *
 * Every element with the `animate` class gets the `active` class once it
 * enters the viewport (or every element matching `selector`). The animation
 * itself lives in CSS (see _animate.scss).
 *
 * Staggering:
 *   All elements entering view go into one queue sorted by page position, and
 *   are revealed top-to-bottom at least `stagger` ms apart (tighter when the
 *   queue is long, so it drains within ~maxDelay).
 *   - Many elements arriving together (page load, fast scroll) reveal one
 *     after another, in order.
 *   - Elements arriving spaced out (normal scrolling) reveal immediately.
 *
 * @param {Object} [options]             Options.
 * @param {string} [options.selector]    Elements to reveal.
 * @param {string} [options.activeClass] Class added when an element is revealed.
 * @param {number} [options.stagger]     Minimum ms between reveals queued together.
 * @param {number} [options.maxDelay]    Rough max ms to drain a long queue.
 * @param {string} [options.rootMargin]  IntersectionObserver root margin.
 * @param {number} [options.threshold]   IntersectionObserver threshold.
 */
export function initAnimations( {
	selector = '.animate',
	activeClass = 'active',
	stagger = 200, // ms between elements revealed together
	maxDelay = 1500, // rough max time to drain the queue; long queues use a tighter step
	rootMargin = '0px 0px -10% 0px', // trigger slightly before the bottom edge
	threshold = 0,
} = {} ) {
	const elements = document.querySelectorAll( selector );
	if ( ! elements.length ) {
		return;
	}

	const reveal = ( el ) => el.classList.add( activeClass );

	// No motion preference or no observer support: show everything now.
	const reduceMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches;
	if ( reduceMotion || ! ( 'IntersectionObserver' in window ) ) {
		elements.forEach( reveal );
		return;
	}

	const pending = new Set( elements ); // not yet queued
	const waiting = []; // queued, sorted top-to-bottom, waiting to reveal
	let lastReveal = -Infinity; // performance.now() of the previous reveal
	let timer = null;

	// One shared queue and one timer, so every reveal (whatever batch it
	// arrived in) happens in page order. The step shrinks when many are
	// waiting so a long queue still drains within ~maxDelay.
	const tick = () => {
		timer = null;
		if ( ! waiting.length ) {
			return;
		}
		const step = Math.min( stagger, maxDelay / waiting.length );
		const wait = lastReveal + step - performance.now();
		if ( wait > 1 ) {
			timer = setTimeout( tick, wait );
			return;
		}
		reveal( waiting.shift().el );
		lastReveal = performance.now();
		tick();
	};

	const queue = ( els ) => {
		for ( const el of els ) {
			if ( ! pending.delete( el ) ) {
				continue;
			} // already queued
			observer.unobserve( el ); // animate once
			const r = el.getBoundingClientRect();
			waiting.push( { el, top: r.top + window.scrollY, left: r.left } );
		}
		// Top-to-bottom, then left-to-right, in page (not viewport) coordinates.
		waiting.sort( ( a, b ) => a.top - b.top || a.left - b.left );
		if ( ! timer ) {
			tick();
		}
		if ( ! pending.size ) {
			stopBottomCheck();
		}
	};

	const observer = new IntersectionObserver(
		( entries ) =>
			queue(
				entries
					.filter( ( e ) => e.isIntersecting )
					.map( ( e ) => e.target )
			),
		{ rootMargin, threshold }
	);

	// The negative bottom rootMargin means elements near the end of the page
	// (e.g. the footer) can never scroll far enough up to trigger. Once the
	// page is scrolled to the bottom, reveal anything still hidden on screen.
	const checkBottom = () => {
		const atBottom =
			window.innerHeight + window.scrollY >=
			document.documentElement.scrollHeight - 2;
		if ( ! atBottom ) {
			return;
		}
		queue(
			[ ...pending ].filter(
				( el ) => el.getBoundingClientRect().top < window.innerHeight
			)
		);
	};
	const stopBottomCheck = () => {
		window.removeEventListener( 'scroll', checkBottom );
		window.removeEventListener( 'resize', checkBottom );
	};
	window.addEventListener( 'scroll', checkBottom, { passive: true } );
	window.addEventListener( 'resize', checkBottom );

	elements.forEach( ( el ) => observer.observe( el ) );
	checkBottom(); // short pages that don't scroll at all
}
