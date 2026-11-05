/**
 * ESLint: WordPress defaults (from @wordpress/scripts) plus project settings.
 */
const globals = require( 'globals' );
const wpDefaults = require( '@wordpress/scripts/config/eslint.config.cjs' );

module.exports = [
	...wpDefaults,
	{
		languageOptions: {
			globals: { ...globals.browser },
		},
		settings: {
			// @wordpress/* packages are webpack externals, provided by WordPress
			// at runtime as wp.* globals, so they aren't installed locally.
			'import/core-modules': [
				'@wordpress/blocks',
				'@wordpress/block-editor',
				'@wordpress/components',
				'@wordpress/i18n',
				'@wordpress/server-side-render',
			],
		},
	},
	{
		// Node scripts (accessibility tests) report to the terminal, and their
		// page.evaluate() callbacks run inside the browser page.
		files: [ 'tests/**' ],
		languageOptions: { globals: { ...globals.node } },
		rules: {
			'no-console': 'off',
			'@wordpress/no-global-active-element': 'off',
		},
	},
];
