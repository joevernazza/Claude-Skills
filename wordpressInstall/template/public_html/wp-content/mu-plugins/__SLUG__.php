<?php
/**
 * Plugin Name: __SITE_NAME__ Site
 * Description: Site functionality for __DOMAIN__: Site Settings (head/header/footer fields), security hardening, SEO output, analytics, browser caching and custom blocks. Must-use, so it can't be deactivated and survives theme changes.
 * Version: 1.0.0
 * Author: __AUTHOR__
 * Author URI: __PROD_URL__
 * License: GPL-2.0-or-later
 * Text Domain: __SLUG__
 *
 * @package __SLUG__
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( '__PREFIX_UPPER___SITE_DIR', __DIR__ . '/__SLUG__' );

// @pages-only
require_once __PREFIX_UPPER___SITE_DIR . '/inc/pages-only.php';
require_once __PREFIX_UPPER___SITE_DIR . '/inc/site-settings.php';
require_once __PREFIX_UPPER___SITE_DIR . '/inc/security.php';
require_once __PREFIX_UPPER___SITE_DIR . '/inc/seo.php';
require_once __PREFIX_UPPER___SITE_DIR . '/inc/analytics.php';
require_once __PREFIX_UPPER___SITE_DIR . '/inc/htaccess.php';
require_once __PREFIX_UPPER___SITE_DIR . '/inc/blocks.php';
