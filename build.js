// Concatenates src files in load order into dist/sinpex.js and minifies to dist/sinpex.min.js.
// Order matters: core first, modules next, master-init last.
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

const pkg = require('./package.json');

const order = [
  'src/vendor/feedbucket.js',

  'src/core/gsap-setup.js',
  'src/core/cleanup-registry.js',
  'src/core/lenis.js',
  'src/core/barba.js',

  'src/modules/card-stack.js',
  'src/modules/metrics-counter.js',
  'src/modules/text-split.js',
  'src/modules/nav-menu.js',
  'src/modules/nav-theme.js',
  'src/modules/button-icon-recolour.js',
  'src/modules/swiper-a11y.js',
  'src/modules/logo-marquee.js',
  'src/modules/centered-slider.js',
  'src/modules/hero-image-scale.js',
  'src/modules/cards-stagger.js',
  'src/modules/fade-in-reveal.js',
  'src/modules/divider-grow.js',
  'src/modules/parallax-images.js',
  'src/modules/back-to-top.js',
  'src/modules/logo-wall-cycle.js',
  'src/modules/slider-video-lightbox.js',
  'src/modules/bunny-player.js',
  'src/modules/layer-stack.js',
  'src/modules/fade-slider.js',
  'src/modules/capability-table.js',
  'src/modules/faq.js',

  'src/core/master-init.js'
];

// Fail loudly if a file in src/ is missing from the order list (or the other way round)
const onDisk = [];
(function walk(dir) {
  fs.readdirSync(dir).forEach((f) => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) onDisk.push(p.split(path.sep).join('/'));
  });
})('src');
const missing = onDisk.filter((f) => !order.includes(f));
const unknown = order.filter((f) => !onDisk.includes(f));
if (missing.length || unknown.length) {
  console.error('Build order out of sync.\nNot in order list:', missing, '\nNot on disk:', unknown);
  process.exit(1);
}

const banner = `/*! Sinpex Webflow scripts v${pkg.version} | built ${new Date().toISOString().slice(0, 10)} */\n`;
const bundle = banner + order
  .map((f) => `\n/* ===== ${f} ===== */\n` + fs.readFileSync(f, 'utf8'))
  .join('\n');

fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/sinpex.js', bundle);

minify(bundle, {
  compress: true,
  mangle: true, // top-level names stay intact (toplevel: false), so init functions stay global
  format: { comments: /^!/ }
}).then((out) => {
  fs.writeFileSync('dist/sinpex.min.js', out.code);
  console.log(`dist/sinpex.js ${(bundle.length / 1024).toFixed(1)} KB`);
  console.log(`dist/sinpex.min.js ${(out.code.length / 1024).toFixed(1)} KB`);
});
