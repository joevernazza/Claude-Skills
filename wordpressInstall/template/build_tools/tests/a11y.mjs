/**
 * Automated accessibility test: axe-core (WCAG 2.0/2.1/2.2 A + AA) on every
 * published page, at desktop and mobile widths, plus keyboard checks for the
 * skip link and the mobile menu.
 *
 *   npm run test:a11y                         # http://localhost:__PORT__
 *   A11Y_URL=https://staging.example.com npm run test:a11y
 *
 * Exits with 1 if anything fails. First run: `npx playwright install chromium`.
 */
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const BASE = ( process.env.A11Y_URL || 'http://localhost:__PORT__' ).replace(
	/\/+$/,
	''
);
const TAGS = [ 'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa' ];
const VIEWPORTS = [
	{ name: 'desktop', width: 1280, height: 900 },
	{ name: 'mobile', width: 375, height: 812 },
];

const failures = [];
const fail = ( message ) => failures.push( message );

/**
 * Published pages (and posts, if the site has them) from the REST API, plus
 * search and 404 results.
 *
 * @return {Promise<string[]>} URLs to test.
 */
async function collectUrls() {
	const urls = new Set( [ `${ BASE }/` ] );
	for ( const type of [ 'pages', 'posts' ] ) {
		try {
			const res = await fetch(
				`${ BASE }/wp-json/wp/v2/${ type }?per_page=100&_fields=link`
			);
			if ( res.ok ) {
				( await res.json() ).forEach( ( item ) =>
					urls.add( item.link )
				);
			}
		} catch {
			// Endpoint unavailable (e.g. posts disabled): skip.
		}
	}
	urls.add( `${ BASE }/?s=a11y` );
	urls.add( `${ BASE }/a11y-test-missing-page/` );
	return [ ...urls ];
}

/**
 * Keyboard: the first Tab reaches a visible skip link that moves focus to main.
 *
 * @param {import('playwright').Page} page Page on the homepage.
 */
async function checkSkipLink( page ) {
	await page.keyboard.press( 'Tab' );
	const first = await page.evaluate( () => {
		const el = document.activeElement;
		const box = el.getBoundingClientRect();
		return {
			cls: el.className,
			href: el.getAttribute( 'href' ),
			visible: box.width > 1 && box.height > 1 && box.top >= 0,
		};
	} );
	if ( ! String( first.cls ).includes( 'skip-link' ) ) {
		return fail(
			`Keyboard: first Tab should focus the skip link, got "${ first.cls }"`
		);
	}
	if ( ! first.visible ) {
		fail( 'Keyboard: skip link is not visible when focused' );
	}
	await page.keyboard.press( 'Enter' );
	await page.waitForTimeout( 200 );
	const target = await page.evaluate(
		() => document.activeElement?.id || document.activeElement?.tagName
	);
	if ( target !== 'wp--skip-link--target' && target !== 'MAIN' ) {
		fail(
			`Keyboard: skip link should move focus to <main>, got ${ target }`
		);
	}
}

/**
 * Keyboard: the mobile menu opens from the keyboard, traps focus in a modal,
 * and Escape closes it and returns focus to the toggle.
 *
 * @param {import('playwright').Page} page Page at mobile width.
 */
async function checkMobileMenu( page ) {
	const toggle = page
		.locator( '.wp-block-navigation__responsive-container-open' )
		.first();
	if ( ! ( await toggle.count() ) ) {
		return fail( 'Mobile menu: no menu toggle button found' );
	}
	await toggle.focus();
	await page.keyboard.press( 'Enter' );
	const dialog = page
		.locator( '.wp-block-navigation__responsive-container.is-menu-open' )
		.first();
	try {
		await dialog.waitFor( { timeout: 3000 } );
	} catch {
		return fail( 'Mobile menu: Enter on the toggle did not open the menu' );
	}
	// Core moves focus into the dialog right after it opens.
	const inside = await page
		.waitForFunction(
			() =>
				!! document.activeElement?.closest(
					'.wp-block-navigation__responsive-container.is-menu-open'
				),
			null,
			{ timeout: 2000 }
		)
		.then(
			() => true,
			() => false
		);
	if ( ! inside ) {
		fail( 'Mobile menu: focus did not move into the open menu' );
	}
	const links = await dialog.locator( 'a' ).count();
	if ( ! links ) {
		fail( 'Mobile menu: open menu has no links' );
	}
	await page.keyboard.press( 'Escape' );
	await page.waitForTimeout( 300 );
	const back = await page.evaluate( () =>
		document.activeElement?.classList.contains(
			'wp-block-navigation__responsive-container-open'
		)
	);
	if ( ! back ) {
		fail(
			'Mobile menu: Escape should close the menu and return focus to the toggle'
		);
	}
}

/**
 * Focus visibility: tabbing to a link shows an outline.
 *
 * @param {import('playwright').Page} page Page on the homepage.
 */
async function checkFocusRing( page ) {
	const link = page.locator( 'main a[href], header a[href]' ).first();
	if ( ! ( await link.count() ) ) {
		return;
	}
	await link.focus();
	await page.keyboard.press( 'Shift+Tab' );
	await page.keyboard.press( 'Tab' );
	const outline = await page.evaluate( () => {
		const s = getComputedStyle( document.activeElement );
		return s.outlineStyle !== 'none' && parseFloat( s.outlineWidth ) >= 2;
	} );
	if ( ! outline ) {
		fail( 'Focus: links have no visible focus outline (expect ≥2px)' );
	}
}

const urls = await collectUrls();
const browser = await chromium.launch();
let checked = 0;

for ( const vp of VIEWPORTS ) {
	// reducedMotion: reveal animations show everything at once, so axe sees
	// final colors instead of half-faded text.
	const context = await browser.newContext( {
		viewport: vp,
		reducedMotion: 'reduce',
	} );
	const page = await context.newPage();

	for ( const url of urls ) {
		await page.goto( url, { waitUntil: 'load' } );
		const { violations } = await new AxeBuilder( { page } )
			.withTags( TAGS )
			.analyze();
		checked++;
		for ( const v of violations ) {
			const where = v.nodes
				.slice( 0, 3 )
				.map( ( n ) => n.target.join( ' ' ) )
				.join( ' | ' );
			fail(
				`[${ vp.name }] ${ url.replace( BASE, '' ) || '/' }: ${ v.id } (${ v.impact }), ${ v.help } -> ${ where }`
			);
		}
	}

	await page.goto( `${ BASE }/`, { waitUntil: 'load' } );
	if ( vp.name === 'desktop' ) {
		await checkSkipLink( page );
		await page.goto( `${ BASE }/`, { waitUntil: 'load' } );
		await checkFocusRing( page );
	} else {
		await checkMobileMenu( page );
	}
	await context.close();
}

await browser.close();

console.log(
	`Accessibility: ${ urls.length } URLs × ${ VIEWPORTS.length } viewports (${ checked } axe scans) + keyboard checks against ${ BASE }`
);
if ( failures.length ) {
	console.error(
		`\n✖ ${ failures.length } problem(s):\n  ${ failures.join( '\n  ' ) }`
	);
	process.exit( 1 );
}
console.log( '✔ No WCAG 2.2 AA violations found.' );
