<?php
/**
 * Production wp-config.php reference for __DOMAIN__.
 *
 * This file is NOT deployed. The real wp-config.php lives only on the server,
 * above or inside the web root, with permissions 400 or 440. Copy the settings
 * below into it, keeping the database credentials and salts from the server.
 *
 * @package __SLUG__
 */

// ** Database (from cPanel > MySQL Databases) ** //
define( 'DB_NAME', 'cpaneluser___PREFIX__' );
define( 'DB_USER', 'cpaneluser_wp' );
define( 'DB_PASSWORD', 'set-on-server' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8mb4' );
define( 'DB_COLLATE', '' );

// ** Salts: generate fresh ones at https://api.wordpress.org/secret-key/1.1/salt/ ** //
// define( 'AUTH_KEY', '...' ); ...and the other seven.

$table_prefix = '__PREFIX___'; // Non-default prefix, set at install time.

// ** Environment ** //
// Read with wp_get_environment_type(); the must-use plugin only loads
// Google Tag Manager when this is 'production'. Docker sets 'local'.
define( 'WP_ENVIRONMENT_TYPE', 'production' );

// Optional: the GTM container is normally set in Settings > Site Settings.
// Define this to override it, or as an empty string to turn analytics off.
// define( '__PREFIX_UPPER___GTM_ID', 'GTM-XXXXXXX' );

// ** URLs and HTTPS ** //
define( 'WP_HOME', '__PROD_URL__' );
define( 'WP_SITEURL', '__PROD_URL__' );
define( 'FORCE_SSL_ADMIN', true );

// ** Debugging: off on production, errors logged outside the web root ** //
define( 'WP_DEBUG', false );
define( 'WP_DEBUG_DISPLAY', false );
define( 'WP_DEBUG_LOG', '/home/cpaneluser/logs/wp-debug.log' );
define( 'SCRIPT_DEBUG', false );
@ini_set( 'display_errors', '0' ); // phpcs:ignore

// ** Code changes ship through git deploys only ** //
define( 'DISALLOW_FILE_EDIT', true );   // No theme/plugin editors in wp-admin.
define( 'DISALLOW_FILE_MODS', false );  // true also blocks installs/updates from wp-admin.

// ** Updates ** //
define( 'WP_AUTO_UPDATE_CORE', 'minor' ); // Security/maintenance releases only.

// ** Housekeeping ** //
define( 'WP_POST_REVISIONS', 10 );
define( 'AUTOSAVE_INTERVAL', 120 );
define( 'EMPTY_TRASH_DAYS', 14 );
define( 'WP_MEMORY_LIMIT', '256M' );

// Use a real cron job instead of page-load cron (cPanel > Cron Jobs):
//   */15 * * * * wget -q -O - __PROD_URL__/wp-cron.php?doing_wp_cron >/dev/null 2>&1
define( 'DISABLE_WP_CRON', true );

/* That's all, stop editing! Happy publishing. */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
