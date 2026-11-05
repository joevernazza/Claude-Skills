import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import liveReload from './vite-live-reload.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const theme = path.resolve(root, '../public_html/wp-content/themes/__SLUG__');

// Compiles build_tools/src into the theme's assets folder:
//   src/js/main.js        -> <theme>/assets/js/main.js
//   src/scss/style.scss   -> <theme>/assets/css/main.css (imported by main.js)
export default defineConfig({
  root,
  publicDir: false,
  // Only active during `npm run watch` (vite build --watch)
  plugins: [
    liveReload({
      watch: [
        ...['functions.php', 'templates', 'parts', 'patterns', 'theme.json'].map((p) => path.join(theme, p)),
        // Must-use plugin PHP and the built blocks (wp-scripts writes there)
        path.resolve(root, '../public_html/wp-content/mu-plugins'),
      ],
    }),
  ],
  build: {
    outDir: path.join(theme, 'assets'),
    emptyOutDir: false, // assets/ also holds the theme's images/fonts/editor css; never wipe it
    assetsDir: '',
    cssCodeSplit: false,
    minify: true,
    sourcemap: false,
    rollupOptions: {
      input: path.join(root, 'src/js/main.js'),
      output: {
        entryFileNames: 'js/[name].js',
        assetFileNames: (asset) =>
          asset.names?.some((n) => n.endsWith('.css')) ? 'css/main.css' : 'css/[name][extname]',
      },
    },
  },
});
