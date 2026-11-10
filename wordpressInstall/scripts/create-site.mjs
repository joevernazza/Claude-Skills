#!/usr/bin/env node
/**
 * Creates a new WordPress project from ../template and installs it locally.
 *
 *   node create-site.mjs --dir ~/Work/acme --name "Acme Studio" [options]
 *
 * Steps: copy + fill in the template -> npm install/build -> composer install
 * -> docker compose up (images pinned by digest) -> wp core install -> theme,
 * settings, permalinks, blank Home page + Main menu -> optional git init + commit.
 *
 * Run with --help for every option. No npm dependencies (Node 18+ built-ins).
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const TEMPLATE = path.join( SKILL_DIR, 'template' );
const SCRIPTS_DIR = path.join( SKILL_DIR, 'scripts' );
const BINARY_EXT = new Set( [ '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.zip' ] );

const HELP = `
Usage: node create-site.mjs --dir <path> --name "<Site Name>" [options]

Required
  --dir <path>           New project folder (must not exist, be empty, or contain only .git)
  --name <text>          Site name (Site Title, theme name)

Identity (defaults are derived from --name)
  --slug <slug>          Theme/plugin folder, text domain, block namespace (kebab-case)
  --prefix <prefix>      PHP function/option prefix and DB name (snake_case)
  --tagline <text>       Site tagline                     (default: "Just another WordPress site")
  --author <text>        Theme/plugin author             (default: git user.name)
  --prod-url <url>       Production URL                   (default: https://<slug>.test)

Features
  --pages-only           Pages-only site: no posts/comments/feeds (default)
  --no-pages-only        Keep posts and comments
  --gtm <GTM-XXXX>       Google Tag Manager container, saved in Settings > Site Settings
                         (loads on production only; default: none)

Server versions (match production)
  --php <x.y>            PHP version for the WordPress/WP-CLI images (default: 8.4)
  --db <engine>          mysql (default) or mariadb
  --db-version <x.y>     Image version, e.g. 8.4, 8.0, 11.4, 10.6 (default: 8.4 / 11.4)

Local install
  --port <n>             WordPress port (phpMyAdmin = port + 1; default: first free from 8090)
  --admin-user <name>    Admin username                   (default: <prefix>_admin)
  --admin-email <email>  Admin email                      (default: git user.email)
  --admin-password <pw>  Admin password                   (default: random, printed at the end)
  --git                  git init + initial commit
  --no-start             Only create the files; skip installs, Docker and WordPress setup
  --help
`;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs( argv ) {
	const flags = new Set( [ 'pages-only', 'no-pages-only', 'git', 'no-start', 'help' ] );
	const out = {};
	for ( let i = 0; i < argv.length; i++ ) {
		const arg = argv[ i ];
		if ( ! arg.startsWith( '--' ) ) {
			fail( `Unexpected argument: ${ arg }` );
		}
		const [ key, inline ] = arg.slice( 2 ).split( /=(.*)/s );
		if ( flags.has( key ) ) {
			out[ key ] = true;
		} else {
			const value = inline ?? argv[ ++i ];
			if ( value === undefined ) {
				fail( `Missing value for --${ key }` );
			}
			out[ key ] = value;
		}
	}
	return out;
}

function fail( message ) {
	console.error( `\n✖ ${ message }` );
	process.exit( 1 );
}

function step( message ) {
	console.log( `\n▸ ${ message }` );
}

function run( cmd, args, { cwd, capture = false, input, allowFail = false } = {} ) {
	const res = spawnSync( cmd, args, {
		cwd,
		input,
		encoding: 'utf8',
		stdio: capture || input !== undefined ? [ input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe' ] : 'inherit',
	} );
	if ( res.error ) {
		if ( allowFail ) {
			return res;
		}
		fail( `${ cmd } failed to start: ${ res.error.message }` );
	}
	if ( res.status !== 0 && ! allowFail ) {
		fail( `${ cmd } ${ args.join( ' ' ) } exited with ${ res.status }\n${ res.stderr || '' }` );
	}
	return res;
}

function has( cmd ) {
	return spawnSync( 'which', [ cmd ], { stdio: 'ignore' } ).status === 0;
}

function gitConfig( key ) {
	const res = spawnSync( 'git', [ 'config', '--get', key ], { encoding: 'utf8' } );
	return res.status === 0 ? res.stdout.trim() : '';
}

function portFree( port ) {
	return new Promise( ( resolve ) => {
		const server = net.createServer();
		server.once( 'error', () => resolve( false ) );
		server.once( 'listening', () => server.close( () => resolve( true ) ) );
		server.listen( port, '0.0.0.0' );
	} );
}

async function pickPort( requested ) {
	if ( requested ) {
		if ( ! ( await portFree( requested ) ) || ! ( await portFree( requested + 1 ) ) ) {
			fail( `Port ${ requested } or ${ requested + 1 } is already in use.` );
		}
		return requested;
	}
	for ( let p = 8090; p < 8200; p += 2 ) {
		if ( ( await portFree( p ) ) && ( await portFree( p + 1 ) ) ) {
			return p;
		}
	}
	fail( 'No free port pair found between 8090 and 8200. Pass --port.' );
}

const sleep = ( ms ) => new Promise( ( r ) => setTimeout( r, ms ) );

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

const args = parseArgs( process.argv.slice( 2 ) );
if ( args.help ) {
	console.log( HELP );
	process.exit( 0 );
}
if ( ! args.dir || ! args.name ) {
	console.log( HELP );
	fail( '--dir and --name are required.' );
}

const dir = path.resolve( args.dir.replace( /^~(?=$|\/)/, os.homedir() ) );
const name = args.name.trim();
const slug = ( args.slug || name.toLowerCase().replace( /[^a-z0-9]+/g, '-' ).replace( /^-+|-+$/g, '' ) ).toLowerCase();
const prefix = ( args.prefix || slug.replace( /-/g, '_' ) ).toLowerCase();
const tagline = args.tagline ?? 'Just another WordPress site';
const author = args.author || gitConfig( 'user.name' ) || name;
const prodUrl = ( args[ 'prod-url' ] || `https://${ slug }.test` ).replace( /\/+$/, '' );
const pagesOnly = ! args[ 'no-pages-only' ];
const gtm = args.gtm || '';
const DB_ENGINES = {
	mysql: { label: 'MySQL', image: 'mysql', version: '8.4', client: 'mysql', dump: 'mysqldump' },
	mariadb: { label: 'MariaDB', image: 'mariadb', version: '11.4', client: 'mariadb', dump: 'mariadb-dump' },
};
const phpVersion = args.php || '8.4';
if ( ! /^\d+\.\d+$/.test( phpVersion ) ) {
	fail( `Invalid --php "${ phpVersion }" (e.g. 8.4).` );
}
const dbEngine = ( args.db || 'mysql' ).toLowerCase();
const db = DB_ENGINES[ dbEngine ];
if ( ! db ) {
	fail( `Invalid --db "${ args.db }": use mysql or mariadb.` );
}
const dbVersion = args[ 'db-version' ] || db.version;
// WP-CLI's bundled MariaDB client requires TLS: only MariaDB 11.4+ servers
// satisfy it out of the box.
const [ dbMajor, dbMinor = 0 ] = dbVersion.split( '.' ).map( Number );
const wpDbWorks = dbEngine === 'mariadb' && ( dbMajor > 11 || ( dbMajor === 11 && dbMinor >= 4 ) );
if ( ! /^\d+(\.\d+){0,2}$/.test( dbVersion ) ) {
	fail( `Invalid --db-version "${ dbVersion }" (e.g. 8.4 or 11.4).` );
}
const adminUser = args[ 'admin-user' ] || `${ prefix }_admin`;
const adminEmail = args[ 'admin-email' ] || gitConfig( 'user.email' ) || `admin@${ slug }.test`;
const adminPassword = args[ 'admin-password' ] || crypto.randomBytes( 18 ).toString( 'base64url' );
const project = slug.replace( /[^a-z0-9]/g, '' );

if ( ! /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test( slug ) ) {
	fail( `Invalid slug "${ slug }": use lowercase letters, numbers and single hyphens, starting with a letter.` );
}
if ( ! /^[a-z][a-z0-9_]*$/.test( prefix ) || prefix.length > 20 ) {
	fail( `Invalid prefix "${ prefix }": lowercase letters, numbers and underscores, starting with a letter, max 20 chars.` );
}
if ( [ 'wp', 'wordpress', 'admin', 'core' ].includes( prefix ) ) {
	fail( `Prefix "${ prefix }" is reserved; pass --prefix.` );
}
if ( gtm && ! /^GTM-[A-Z0-9]+$/.test( gtm ) ) {
	fail( `Invalid GTM container ID "${ gtm }" (expected GTM-XXXXXXX).` );
}
let domain;
try {
	domain = new URL( prodUrl ).host;
} catch {
	fail( `Invalid --prod-url "${ prodUrl }".` );
}
// An existing git repo with no files (only .git) is allowed, so a project
// can be rebuilt in place while keeping its history and remote.
if ( fs.existsSync( dir ) && fs.readdirSync( dir ).filter( ( f ) => ! [ '.DS_Store', '.git' ].includes( f ) ).length ) {
	fail( `${ dir } already exists and isn't empty (only an empty folder or one containing just .git is allowed).` );
}

const initials = name
	.split( /\s+/ )
	.filter( Boolean )
	.slice( 0, 2 )
	.map( ( w ) => w[ 0 ].toUpperCase() )
	.join( '' );

// Longest tokens first so __PREFIX_UPPER__ isn't clobbered by __PREFIX__.
const TOKENS = [
	[ '__PREFIX_UPPER__', prefix.toUpperCase() ],
	[ '__PMA_PORT__', null ], // filled after the port is picked
	[ '__SITE_NAME__', name ],
	[ '__PROD_URL__', prodUrl ],
	[ '__INITIALS__', initials ],
	[ '__PROJECT__', project ],
	[ '__PREFIX__', prefix ],
	[ '__DOMAIN__', domain ],
	[ '__AUTHOR__', author ],
	[ '__GTM_ID__', gtm ],
	[ '__SLUG__', slug ],
	[ '__PORT__', null ],
	[ '__YEAR__', String( new Date().getFullYear() ) ],
	[ '__PHP_VERSION__', phpVersion ],
	[ '__DB_IMAGE__', `${ db.image }:${ dbVersion }` ],
	[ '__DB_LABEL__', `${ db.label } ${ dbVersion }` ],
	[ '__DB_CLIENT__', db.client ],
	[ '__DB_DUMP__', db.dump ],
];

const fillTokens = ( text ) => TOKENS.reduce( ( s, [ token, value ] ) => s.split( token ).join( value ), text );

// ---------------------------------------------------------------------------
// 1. Files
// ---------------------------------------------------------------------------

function copyTemplate( src, dest ) {
	for ( const entry of fs.readdirSync( src, { withFileTypes: true } ) ) {
		if ( entry.name === '.DS_Store' ) {
			continue;
		}
		const from = path.join( src, entry.name );
		const to = path.join( dest, fillTokens( entry.name ) );
		if ( entry.isDirectory() ) {
			fs.mkdirSync( to, { recursive: true } );
			copyTemplate( from, to );
		} else if ( BINARY_EXT.has( path.extname( entry.name ).toLowerCase() ) ) {
			fs.copyFileSync( from, to );
		} else {
			fs.writeFileSync( to, fillTokens( fs.readFileSync( from, 'utf8' ) ) );
			fs.chmodSync( to, fs.statSync( from ).mode );
		}
	}
}

/**
 * Keeps the lines inside `@db:<engine>` ... `/@db:<engine>` marker blocks for
 * the chosen engine, drops the other engines' blocks, and removes the marker
 * lines themselves (any comment style: #, //, <!-- -->).
 *
 * @param {string} root Project folder.
 */
function applyDbBlocks( root ) {
	const walk = ( d ) => {
		for ( const e of fs.readdirSync( d, { withFileTypes: true } ) ) {
			const p = path.join( d, e.name );
			if ( e.isDirectory() ) {
				walk( p );
				continue;
			}
			if ( BINARY_EXT.has( path.extname( e.name ).toLowerCase() ) ) {
				continue;
			}
			const text = fs.readFileSync( p, 'utf8' );
			if ( ! text.includes( '@db:' ) ) {
				continue;
			}
			let skip = false;
			const out = [];
			for ( const line of text.split( '\n' ) ) {
				const close = line.match( /\/@db:(\w+)/ );
				const open = ! close && line.match( /@db:(\w+)/ );
				if ( close ) {
					skip = false;
				} else if ( open ) {
					skip = open[ 1 ] !== dbEngine;
				} else if ( ! skip ) {
					out.push( line );
				}
			}
			fs.writeFileSync( p, out.join( '\n' ) );
		}
	};
	walk( root );
}

function applyPagesOnly( root ) {
	const loader = path.join( root, `public_html/wp-content/mu-plugins/${ slug }.php` );
	let l = fs.readFileSync( loader, 'utf8' );
	l = pagesOnly ? l.replace( '// @pages-only\n', '' ) : l.replace( /\/\/ @pages-only\n.*\n/, '' );
	fs.writeFileSync( loader, l );

	// Markdown docs: keep or drop <!-- @pages-only --> ... <!-- /@pages-only --> blocks.
	for ( const doc of [ 'README.md', 'docs/blocks-and-markup.md' ] ) {
		const file = path.join( root, doc );
		let r = fs.readFileSync( file, 'utf8' );
		r = pagesOnly
			? r.replace( /<!-- \/?@pages-only -->\n/g, '' )
			: r.replace( /<!-- @pages-only -->\n[\s\S]*?<!-- \/@pages-only -->\n/g, '' );
		fs.writeFileSync( file, r );
	}

	if ( ! pagesOnly ) {
		fs.rmSync( path.join( root, `public_html/wp-content/mu-plugins/${ slug }/inc/pages-only.php` ) );
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const noStart = !! args[ 'no-start' ];

if ( ! noStart ) {
	for ( const cmd of [ 'docker', 'node', 'npm' ] ) {
		if ( ! has( cmd ) ) {
			fail( `${ cmd } isn't installed (or not on PATH).` );
		}
	}
	if ( run( 'docker', [ 'info' ], { capture: true, allowFail: true } ).status !== 0 ) {
		fail( 'Docker is installed but not running. Start Docker Desktop and try again.' );
	}
	const volumes = run( 'docker', [ 'volume', 'ls', '-q' ], { capture: true } ).stdout.split( '\n' );
	if ( volumes.includes( `${ project }_db_data` ) ) {
		fail( `A Docker volume "${ project }_db_data" already exists (from another project with this slug). Pass a different --slug, or remove it with: docker volume rm ${ project }_db_data` );
	}
}

// --no-start only writes files, so the port doesn't need to be free yet.
const port = noStart ? Number( args.port ) || 8090 : await pickPort( args.port ? Number( args.port ) : 0 );
TOKENS.find( ( t ) => t[ 0 ] === '__PORT__' )[ 1 ] = String( port );
TOKENS.find( ( t ) => t[ 0 ] === '__PMA_PORT__' )[ 1 ] = String( port + 1 );
const localUrl = `http://localhost:${ port }`;

step( `Creating ${ dir }` );
fs.mkdirSync( dir, { recursive: true } );
copyTemplate( TEMPLATE, dir );
applyPagesOnly( dir );
applyDbBlocks( dir );
const TOKEN_RE = /__(SLUG|PREFIX|PREFIX_UPPER|SITE_NAME|PROD_URL|DOMAIN|PROJECT|PORT|PMA_PORT|AUTHOR|GTM_ID|INITIALS|YEAR|DB_IMAGE|DB_LABEL|DB_CLIENT|DB_DUMP|PHP_VERSION)__|@db:/;
const leftover = ( function scan( d ) {
	return fs.readdirSync( d, { withFileTypes: true } ).flatMap( ( e ) => {
		const p = path.join( d, e.name );
		if ( TOKEN_RE.test( e.name ) ) {
			return [ p ];
		}
		if ( e.isDirectory() ) {
			return scan( p );
		}
		return ! BINARY_EXT.has( path.extname( e.name ).toLowerCase() ) && TOKEN_RE.test( fs.readFileSync( p, 'utf8' ) ) ? [ p ] : [];
	} );
} )( dir );
if ( leftover.length ) {
	fail( `Unreplaced template tokens in:\n${ leftover.join( '\n' ) }` );
}
console.log( `  slug ${ slug } · prefix ${ prefix } · ${ pagesOnly ? 'pages-only' : 'posts enabled' } · PHP ${ phpVersion } · ${ db.label } ${ dbVersion } · port ${ port }` );

if ( noStart ) {
	console.log( `\n✔ Files created (--no-start). Next: cd "${ dir }" && docker compose up -d && (cd build_tools && npm install && npm run build)` );
	process.exit( 0 );
}

// 2. Build tools -------------------------------------------------------------
step( 'Installing build tools (npm install)' );
run( 'npm', [ 'install', '--no-fund', '--no-audit' ], { cwd: path.join( dir, 'build_tools' ) } );
// CI runs `npm ci`, which rejects a lockfile that's out of sync with
// package.json. npm sometimes writes one on the first install (nested
// dependency versions); a second install repairs it.
const lockOk = () => run( 'npm', [ 'ci', '--dry-run', '--no-fund', '--no-audit' ], { cwd: path.join( dir, 'build_tools' ), capture: true, allowFail: true } ).status === 0;
if ( ! lockOk() ) {
	run( 'npm', [ 'install', '--no-fund', '--no-audit' ], { cwd: path.join( dir, 'build_tools' ), capture: true } );
	if ( ! lockOk() ) {
		fail( 'build_tools/package-lock.json is out of sync with package.json (`npm ci` would fail in CI). Run `npm install` in build_tools and check the error.' );
	}
}
// The slug is now inside JS strings, so line lengths differ per project;
// let the project's own Prettier/ESLint config reformat them.
run( 'npx', [ 'wp-scripts', 'lint-js', 'src', 'tests', '--fix' ], { cwd: path.join( dir, 'build_tools' ), capture: true, allowFail: true } );

step( 'Building theme assets and blocks (npm run build)' );
run( 'npm', [ 'run', 'build' ], { cwd: path.join( dir, 'build_tools' ) } );

if ( has( 'composer' ) ) {
	step( 'Installing PHP coding standards (composer install)' );
	run( 'composer', [ 'install', '--no-interaction', '--no-progress' ], { cwd: dir } );
} else {
	console.log( '  composer not found: skipped PHPCS install (run `composer install` later).' );
}

// 3. Docker ------------------------------------------------------------------
step( 'Pulling Docker images' );
if ( run( 'docker', [ 'compose', 'pull', '--quiet' ], { cwd: dir, capture: true, allowFail: true } ).status !== 0 ) {
	fail( `Couldn't pull the images. Check that wordpress:php${ phpVersion }-apache and ${ db.image }:${ dbVersion } exist on Docker Hub (--php / --db-version).` );
}
run( 'docker', [ 'compose', '--profile', 'cli', 'pull', '--quiet', 'cli' ], { cwd: dir } );

// Pin every image to the digest just pulled, so all machines match.
const composeFile = path.join( dir, 'docker-compose.yml' );
let compose = fs.readFileSync( composeFile, 'utf8' );
compose = compose.replace( /^(\s+)image: (\S+)$/gm, ( line, indent, image ) => {
	const res = run( 'docker', [ 'image', 'inspect', image, '--format', '{{index .RepoDigests 0}}' ], { capture: true, allowFail: true } );
	const digest = res.status === 0 ? res.stdout.trim() : '';
	return digest ? `${ indent }# ${ image }\n${ indent }image: ${ digest }` : line;
} );
compose = compose.replace(
	/# Image tags are pinned to a PHP version\. For fully reproducible installs,\n# pin by digest .*\n/,
	'# Images are pinned by digest so every machine runs the same versions.\n# To upgrade: docker pull <tag>, then update the digest (docker image inspect).\n'
);
fs.writeFileSync( composeFile, compose );

step( `Starting WordPress on ${ localUrl }` );
run( 'docker', [ 'compose', 'up', '-d' ], { cwd: dir } );

const wp = ( wpArgs, opts = {} ) => run( 'docker', [ 'compose', 'run', '--rm', '-T', ...( opts.mount ? [ '-v', `${ opts.mount }:/skill:ro` ] : [] ), 'cli', 'wp', ...wpArgs ], { cwd: dir, capture: true, ...opts } );

// Core is copied into public_html by the WordPress container on first start.
for ( let i = 0; ; i++ ) {
	if ( fs.existsSync( path.join( dir, 'public_html/wp-includes/version.php' ) ) && fs.existsSync( path.join( dir, 'public_html/wp-config.php' ) ) ) {
		break;
	}
	if ( i > 90 ) {
		fail( 'WordPress files did not appear in public_html after 3 minutes. Check: docker compose logs wordpress' );
	}
	await sleep( 2000 );
}
// Connect the way WordPress does (PHP mysqli), not with `wp db`: WP-CLI's
// bundled MariaDB client can't log in to MySQL 8.x.
const dbReady = () =>
	run( 'docker', [ 'compose', 'run', '--rm', '-T', 'cli', 'php', '-r', 'exit( @mysqli_connect( getenv( "WORDPRESS_DB_HOST" ), getenv( "WORDPRESS_DB_USER" ), getenv( "WORDPRESS_DB_PASSWORD" ), getenv( "WORDPRESS_DB_NAME" ) ) ? 0 : 1 );' ], { cwd: dir, capture: true, allowFail: true } ).status === 0;
for ( let i = 0; ! dbReady(); i++ ) {
	if ( i > 30 ) {
		fail( 'Database not reachable. Check: docker compose logs db' );
	}
	await sleep( 2000 );
}

// 4. WordPress ---------------------------------------------------------------
step( 'Installing WordPress' );
wp( [ 'core', 'install', `--url=${ localUrl }`, `--title=${ name }`, `--admin_user=${ adminUser }`, `--admin_password=${ adminPassword }`, `--admin_email=${ adminEmail }`, '--skip-email' ] );
wp( [ 'option', 'update', 'blogdescription', tagline ] );
wp( [ 'option', 'update', 'blog_public', '0' ] ); // never indexed locally

step( 'Theme, plugins and permalinks' );
wp( [ 'theme', 'activate', slug ] );
wp( [ 'plugin', 'delete', 'akismet', 'hello' ], { allowFail: true } );
// Keep core's current default theme as a fallback (Site Health recommends one).
const defaultTheme = wp( [ 'eval', 'echo WP_DEFAULT_THEME;' ] ).stdout.trim();
const extraThemes = wp( [ 'theme', 'list', '--field=name' ] )
	.stdout.split( '\n' )
	.map( ( t ) => t.trim() )
	.filter( ( t ) => /^twenty/.test( t ) && t !== defaultTheme );
if ( extraThemes.length ) {
	wp( [ 'theme', 'delete', ...extraThemes ] );
}
wp( [ 'rewrite', 'structure', '/%postname%/', '--hard' ] );
wp( [ 'eval', `${ prefix }_maybe_write_htaccess();` ] );

if ( gtm ) {
	wp( [ 'option', 'update', `${ prefix }_site_settings`, JSON.stringify( { gtm_id: gtm } ), '--format=json' ] );
}

step( 'Starter content' );
wp( [ 'post', 'delete', '1', '2', '--force' ], { allowFail: true } ); // "Hello world!" + "Sample Page"
wp( [ 'comment', 'delete', '1', '--force' ], { allowFail: true } );
// One blank Home page as the front page. The theme has no full-page
// patterns on purpose (they trigger WordPress's "Choose a pattern" screen
// on every new page); section patterns are in the inserter.
const homeId = wp( [ 'post', 'create', '--post_type=page', '--post_status=publish', '--post_title=Home', '--post_name=home', `--post_excerpt=${ tagline }`, '--post_author=1', '--porcelain' ] ).stdout.trim();
wp( [ 'option', 'update', 'show_on_front', 'page' ] );
wp( [ 'option', 'update', 'page_on_front', homeId ] );

step( 'Main menu (Home)' );
wp( [ 'eval-file', '/skill/create-menu.php', homeId ], { mount: SCRIPTS_DIR } );

// 5. Verify ------------------------------------------------------------------
step( 'Checking the site' );
let ok = false;
for ( let i = 0; i < 10 && ! ok; i++ ) {
	try {
		const res = await fetch( `${ localUrl }/` );
		const html = await res.text();
		ok = res.status === 200 && html.includes( `themes/${ slug }/assets/css/main.css` ) && ! /(Fatal error|Warning|Notice|Deprecated):/.test( html );
		if ( ! ok && i === 9 ) {
			fail( `Homepage check failed (HTTP ${ res.status }). Open ${ localUrl } and check: docker compose logs wordpress` );
		}
	} catch {
		await sleep( 1000 );
	}
}

// 6. Accessibility -----------------------------------------------------------
step( 'Accessibility test (axe-core, WCAG 2.2 AA, desktop + mobile, keyboard)' );
const buildTools = path.join( dir, 'build_tools' );
let a11yOk = false;
if ( run( 'npx', [ 'playwright', 'install', 'chromium' ], { cwd: buildTools, capture: true, allowFail: true } ).status === 0 ) {
	const res = run( 'npm', [ 'run', '-s', 'test:a11y' ], { cwd: buildTools, capture: true, allowFail: true } );
	a11yOk = res.status === 0;
	console.log( ( res.stdout + res.stderr ).trim().replace( /^/gm, '  ' ) );
} else {
	console.log( '  Could not install the Playwright browser; run `npx playwright install chromium && npm run test:a11y` in build_tools later.' );
}

// 7. Git ---------------------------------------------------------------------
if ( args.git && has( 'git' ) ) {
	step( 'git init + initial commit' );
	if ( ! fs.existsSync( path.join( dir, '.git' ) ) ) {
		run( 'git', [ 'init', '-q', '-b', 'main' ], { cwd: dir } );
	}
	run( 'git', [ 'add', '-A' ], { cwd: dir } );
	run( 'git', [ 'commit', '-q', '-m', `chore: scaffold ${ name } from wordpressInstall` ], { cwd: dir } );
}

console.log( `
✔ ${ name } is running.

  Site         ${ localUrl }
  Admin        ${ localUrl }/wp-admin
  Username     ${ adminUser }
  Password     ${ adminPassword }
  phpMyAdmin   http://localhost:${ port + 1 }   (root / root)
  Project      ${ dir }

  Pages        Home (front page, blank; Main menu: Home)
  A11y test    ${ a11yOk ? 'passed (WCAG 2.2 AA)' : 'FAILED or skipped, see above' }

  PHP          ${ phpVersion }
  Database     ${ db.label } ${ dbVersion }${ wpDbWorks ? '' : ' (use scripts/db-*.sh, not `wp db`)' }

  Theme ${ slug } · must-use plugin ${ slug } · ${ pagesOnly ? 'pages-only mode' : 'posts + comments enabled' }${ gtm ? ` · GTM ${ gtm } (production only)` : '' }

  Develop:  cd "${ dir }/build_tools" && npm run watch
  Stop:     cd "${ dir }" && docker compose down
` );
