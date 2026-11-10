<?php
/**
 * Site Settings: editable, site-wide values grouped as Head, Header and
 * Footer, at Settings > Site Settings.
 *
 * - Every field is declared once in __PREFIX___site_settings_fields(); the
 *   admin screen, sanitizing and storage all come from that list. Add a field
 *   there (or via the `__PREFIX___site_settings_fields` filter) and it appears.
 * - Values are stored together in the `__PREFIX___site_settings` option and
 *   read with __PREFIX___site_setting( 'key' ).
 * - Head values are printed here; the GTM ID is used by analytics.php; footer
 *   values are shown by the "Site Info" block (blocks/site-info).
 *
 * @package __SLUG__
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const __PREFIX_UPPER___SITE_SETTINGS_OPTION = '__PREFIX___site_settings';

/**
 * Field definitions, grouped into sections.
 *
 * Field types: text, email, url, gtm (GTM-XXXX id), verification (meta tag
 * content; a pasted <meta> tag is reduced to its content value), code
 * (unfiltered HTML for admins who may post it).
 *
 * @return array<string, array{title: string, description: string, fields: array<string, array>}>
 */
function __PREFIX___site_settings_fields() {
	$fields = array(
		'head'   => array(
			'title'       => __( 'Head', '__SLUG__' ),
			'description' => __( 'Added inside <head> on every front-end page.', '__SLUG__' ),
			'fields'      => array(
				'gtm_id'              => array(
					'label'       => __( 'Google Tag Manager ID', '__SLUG__' ),
					'type'        => 'gtm',
					'placeholder' => 'GTM-XXXXXXX',
					'description' => __( 'Loads only on production (WP_ENVIRONMENT_TYPE = production). A __PREFIX_UPPER___GTM_ID constant in wp-config.php overrides this.', '__SLUG__' ),
				),
				'google_verification' => array(
					'label'       => __( 'Google Search Console verification', '__SLUG__' ),
					'type'        => 'verification',
					'description' => __( 'From Search Console\'s "HTML tag" method: paste the content value or the whole <meta> tag.', '__SLUG__' ),
				),
				'bing_verification'   => array(
					'label'       => __( 'Bing Webmaster verification', '__SLUG__' ),
					'type'        => 'verification',
					'description' => __( 'From Bing\'s "Meta tag" method: paste the content value or the whole <meta> tag.', '__SLUG__' ),
				),
				'head_code'           => array(
					'label'       => __( 'Custom head code', '__SLUG__' ),
					'type'        => 'code',
					'description' => __( 'Raw HTML printed before </head>. Scripts are only kept for administrators allowed to post unfiltered HTML.', '__SLUG__' ),
				),
			),
		),
		'header' => array(
			'title'       => __( 'Header', '__SLUG__' ),
			'description' => __( 'No header fields yet. Add them to __PREFIX___site_settings_fields() in the must-use plugin.', '__SLUG__' ),
			'fields'      => array(),
		),
		'footer' => array(
			'title'       => __( 'Footer', '__SLUG__' ),
			'description' => __( 'Shown in the site footer by the Site Info block. Empty fields are hidden.', '__SLUG__' ),
			'fields'      => array(
				'footer_text'      => array(
					'label'       => __( 'Footer text', '__SLUG__' ),
					'type'        => 'text',
					'description' => __( 'Shown next to the copyright line. Leave empty to show the site tagline.', '__SLUG__' ),
				),
				'contact_email'    => array(
					'label' => __( 'Contact email', '__SLUG__' ),
					'type'  => 'email',
				),
				'contact_phone'    => array(
					'label'       => __( 'Contact phone', '__SLUG__' ),
					'type'        => 'text',
					'placeholder' => '555-555-0100',
				),
				'contact_location' => array(
					'label'       => __( 'Location', '__SLUG__' ),
					'type'        => 'text',
					'placeholder' => __( 'City, State', '__SLUG__' ),
				),
				'social_linkedin'  => array(
					'label' => __( 'LinkedIn URL', '__SLUG__' ),
					'type'  => 'url',
				),
				'social_github'    => array(
					'label' => __( 'GitHub URL', '__SLUG__' ),
					'type'  => 'url',
				),
				'social_instagram' => array(
					'label' => __( 'Instagram URL', '__SLUG__' ),
					'type'  => 'url',
				),
				'social_facebook'  => array(
					'label' => __( 'Facebook URL', '__SLUG__' ),
					'type'  => 'url',
				),
				'social_x'         => array(
					'label' => __( 'X (Twitter) URL', '__SLUG__' ),
					'type'  => 'url',
				),
				'social_youtube'   => array(
					'label' => __( 'YouTube URL', '__SLUG__' ),
					'type'  => 'url',
				),
			),
		),
	);

	/**
	 * Filters the Site Settings sections and fields.
	 *
	 * @param array $fields Sections keyed by id, each with title, description and fields.
	 */
	return apply_filters( '__PREFIX___site_settings_fields', $fields );
}

/**
 * Returns one saved Site Settings value.
 *
 * @param string $key     Field key, e.g. 'gtm_id'.
 * @param string $fallback Value when the field is empty.
 * @return string
 */
function __PREFIX___site_setting( $key, $fallback = '' ) {
	$values = get_option( __PREFIX_UPPER___SITE_SETTINGS_OPTION, array() );
	$value  = is_array( $values ) && isset( $values[ $key ] ) ? (string) $values[ $key ] : '';
	return '' === $value ? $fallback : $value;
}

// -------------------------------------------------------------------------
// Admin screen
// -------------------------------------------------------------------------

/**
 * Registers the option, sections and fields with the Settings API.
 *
 * @return void
 */
function __PREFIX___site_settings_register() {
	register_setting(
		'__PREFIX___site_settings',
		__PREFIX_UPPER___SITE_SETTINGS_OPTION,
		array(
			'type'              => 'array',
			'default'           => array(),
			'sanitize_callback' => '__PREFIX___site_settings_sanitize',
			'show_in_rest'      => false,
		)
	);

	foreach ( __PREFIX___site_settings_fields() as $section_id => $section ) {
		add_settings_section(
			"__PREFIX___{$section_id}",
			$section['title'],
			static function () use ( $section ) {
				if ( ! empty( $section['description'] ) ) {
					printf( '<p>%s</p>', esc_html( $section['description'] ) );
				}
			},
			'__SLUG__-site-settings'
		);

		foreach ( $section['fields'] as $key => $field ) {
			add_settings_field(
				$key,
				$field['label'],
				'__PREFIX___site_settings_render_field',
				'__SLUG__-site-settings',
				"__PREFIX___{$section_id}",
				array(
					'key'       => $key,
					'field'     => $field,
					'label_for' => "__PREFIX___{$key}",
				)
			);
		}
	}
}
add_action( 'admin_init', '__PREFIX___site_settings_register' );

/**
 * Adds Settings > Site Settings.
 *
 * @return void
 */
function __PREFIX___site_settings_menu() {
	add_options_page(
		__( 'Site Settings', '__SLUG__' ),
		__( 'Site Settings', '__SLUG__' ),
		'manage_options',
		'__SLUG__-site-settings',
		'__PREFIX___site_settings_page'
	);
}
add_action( 'admin_menu', '__PREFIX___site_settings_menu' );

/**
 * Renders the Site Settings screen.
 *
 * @return void
 */
function __PREFIX___site_settings_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	?>
	<div class="wrap">
		<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
		<form action="options.php" method="post">
			<?php
			settings_fields( '__PREFIX___site_settings' );
			do_settings_sections( '__SLUG__-site-settings' );
			submit_button();
			?>
		</form>
	</div>
	<?php
}

/**
 * Renders one field.
 *
 * @param array $args { key, field, label_for } from add_settings_field().
 * @return void
 */
function __PREFIX___site_settings_render_field( $args ) {
	$key   = $args['key'];
	$field = $args['field'];
	$name  = __PREFIX_UPPER___SITE_SETTINGS_OPTION . "[{$key}]";
	$value = __PREFIX___site_setting( $key );
	$id    = $args['label_for'];
	$desc  = '';

	if ( ! empty( $field['description'] ) ) {
		$desc = sprintf( '<p class="description" id="%1$s-description">%2$s</p>', esc_attr( $id ), esc_html( $field['description'] ) );
	}
	$described = $desc ? sprintf( ' aria-describedby="%s-description"', esc_attr( $id ) ) : '';

	if ( 'code' === $field['type'] ) {
		printf(
			'<textarea id="%1$s" name="%2$s" rows="6" class="large-text code" spellcheck="false"%3$s>%4$s</textarea>',
			esc_attr( $id ),
			esc_attr( $name ),
			$described, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
			esc_textarea( $value )
		);
	} else {
		$input_types = array(
			'email' => 'email',
			'url'   => 'url',
		);
		printf(
			'<input type="%1$s" id="%2$s" name="%3$s" value="%4$s" class="regular-text" placeholder="%5$s"%6$s>',
			esc_attr( $input_types[ $field['type'] ] ?? 'text' ),
			esc_attr( $id ),
			esc_attr( $name ),
			esc_attr( $value ),
			esc_attr( $field['placeholder'] ?? '' ),
			$described // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
		);
	}
	echo $desc; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped above.
}

/**
 * Sanitizes the submitted values by field type. Unknown keys are dropped.
 *
 * @param mixed $input Submitted values.
 * @return array<string, string>
 */
function __PREFIX___site_settings_sanitize( $input ) {
	$input = is_array( $input ) ? $input : array();
	$clean = array();

	foreach ( __PREFIX___site_settings_fields() as $section ) {
		foreach ( $section['fields'] as $key => $field ) {
			$raw = isset( $input[ $key ] ) ? trim( (string) wp_unslash( $input[ $key ] ) ) : '';

			switch ( $field['type'] ) {
				case 'email':
					$value = sanitize_email( $raw );
					break;
				case 'url':
					$value = esc_url_raw( $raw, array( 'http', 'https' ) );
					break;
				case 'gtm':
					$value = strtoupper( sanitize_text_field( $raw ) );
					if ( '' !== $value && ! preg_match( '/^GTM-[A-Z0-9]+$/', $value ) ) {
						add_settings_error( __PREFIX_UPPER___SITE_SETTINGS_OPTION, 'gtm_id', __( 'Google Tag Manager ID must look like GTM-XXXXXXX. It was not saved.', '__SLUG__' ) );
						$value = __PREFIX___site_setting( $key );
					}
					break;
				case 'verification':
					// Accept the whole <meta ... content="..."> tag as well as the value.
					if ( preg_match( '/content\s*=\s*["\']([^"\']+)["\']/i', $raw, $m ) ) {
						$raw = $m[1];
					}
					$value = sanitize_text_field( $raw );
					break;
				case 'code':
					$value = current_user_can( 'unfiltered_html' ) ? $raw : wp_kses_post( $raw );
					break;
				default:
					$value = sanitize_text_field( $raw );
			}

			if ( '' !== $value ) {
				$clean[ $key ] = $value;
			}
		}
	}

	return $clean;
}

// -------------------------------------------------------------------------
// Head output (GTM is printed by analytics.php)
// -------------------------------------------------------------------------

/**
 * Prints the search engine verification tags.
 *
 * @return void
 */
function __PREFIX___site_settings_verification() {
	$tags = array(
		'google-site-verification' => __PREFIX___site_setting( 'google_verification' ),
		'msvalidate.01'            => __PREFIX___site_setting( 'bing_verification' ),
	);
	foreach ( array_filter( $tags ) as $name => $content ) {
		printf( '<meta name="%s" content="%s">' . "\n", esc_attr( $name ), esc_attr( $content ) );
	}
}
add_action( 'wp_head', '__PREFIX___site_settings_verification', 1 );

/**
 * Prints the custom head code last in <head>.
 *
 * @return void
 */
function __PREFIX___site_settings_head_code() {
	$code = __PREFIX___site_setting( 'head_code' );
	if ( $code ) {
		echo $code . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- admin-entered markup, filtered on save for users without unfiltered_html.
	}
}
add_action( 'wp_head', '__PREFIX___site_settings_head_code', 99 );
