/**
 * post-build.js
 * Runs after `expo export --platform web` to inject PWA requirements
 * into the generated dist/index.html, since Expo's Metro bundler
 * ignores +html.tsx during static export.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('❌ dist/index.html not found. Run `expo export --platform web` first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf-8');

// --- 0. Fix viewport to match native Expo Go behavior ---
// Replace the default viewport (which allows iOS zoom-on-focus) with a locked one.
// We also inject a CSS rule to ensure all inputs have font-size >= 16px,
// which is the cleanest iOS-compatible way to prevent zoom without breaking accessibility.
const pwaViewportFix = `
  <!-- PWA: fixed viewport - prevents zoom on input focus, matches native Expo Go behaviour -->
  <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover" />
  <style>
    /* Prevent iOS Safari zoom on input focus without hurting accessibility */
    input, textarea, select {
      font-size: max(16px, 1em) !important;
    }
  </style>`;

// Remove the old viewport meta and replace with our fixed one
html = html.replace(
  /<meta[^>]*name="viewport"[^>]*>/,
  pwaViewportFix
);
console.log('✅ Fixed viewport (prevents zoom-on-input-focus)');


// --- 1. Inject manifest + apple PWA meta tags into <head> ---
const pwaHeadTags = `
  <link rel="manifest" href="/manifest.json" />
  <link rel="apple-touch-icon" href="/logo.png" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Tookio Shop" />`;

if (!html.includes('rel="manifest"')) {
  // Insert right before </head>
  html = html.replace('</head>', `${pwaHeadTags}\n</head>`);
  console.log('✅ Injected manifest + apple-touch meta tags');
} else {
  console.log('ℹ️  Manifest link already present, skipping head injection');
}

// --- 2. Inject service worker registration before </body> ---
const swScript = `
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(function (reg) {
          console.log('[PWA] Service Worker registered:', reg.scope);
        }).catch(function (err) {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
      });
    }
  </script>`;

if (!html.includes("serviceWorker.register('/sw.js')")) {
  html = html.replace('</body>', `${swScript}\n</body>`);
  console.log('✅ Injected service worker registration script');
} else {
  console.log('ℹ️  Service worker registration already present, skipping');
}

fs.writeFileSync(indexPath, html, 'utf-8');
console.log('✅ post-build.js complete — dist/index.html updated for PWA');
