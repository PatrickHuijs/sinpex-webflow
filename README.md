# Sinpex Webflow scripts

All custom JavaScript for the Sinpex Webflow site. CSS stays in Webflow (site head, Global Custom Code and section embeds). Scripts are bundled into one file and served from GitHub through jsDelivr.

## Structure

```
src/
  vendor/     third-party loaders (Feedbucket)
  core/       run once: GSAP setup, cleanup registry, Lenis, Barba, master init
  modules/    one file per feature
dist/
  sinpex.js       readable bundle (for debugging)
  sinpex.min.js   minified bundle (loaded on the site)
webflow/
  site-head.html     head custom code (CSS only)
  site-footer.html   footer custom code (CDN libs + bundle tag)
build.js        bundles src/ in load order
```

## Modules

| File | What it does | CSS lives in |
|---|---|---|
| core/gsap-setup.js | Registers GSAP plugins and `osmo-ease` | – |
| core/cleanup-registry.js | `pageCleanups` + `runPageCleanups()` for Barba | – |
| core/lenis.js | Lenis smooth scroll synced with ScrollTrigger | Site head (lenis.css) |
| core/barba.js | Page transitions and lifecycle hooks | – |
| core/master-init.js | `initPageScripts()`: runs every page init, first load and after each transition. Loads last. | – |
| modules/card-stack.js | Platform card stack | Global Custom Code |
| modules/metrics-counter.js | Number odometer | Site footer + Global Custom Code |
| modules/text-split.js | Masked text reveal | Site head |
| modules/nav-menu.js | Mobile menu + scroll background | – |
| modules/nav-theme.js | Nav base/dark switch per section | – |
| modules/button-icon-recolour.js | Masked button icons | Site head |
| modules/swiper-a11y.js | Swiper accessibility | – |
| modules/logo-marquee.js | CSS logo marquee | Global Custom Code |
| modules/centered-slider.js | Section / Proof slider | Global Custom Code |
| modules/hero-image-scale.js | Hero image scale on scroll | – |
| modules/cards-stagger.js | Cards stagger in | – |
| modules/fade-in-reveal.js | Fade-in reveal | – |
| modules/divider-grow.js | Divider grow reveal | – |
| modules/parallax-images.js | Parallax images | Global Custom Code |
| modules/back-to-top.js | Back to top button | – |
| modules/logo-wall-cycle.js | Logo wall cycle | Global Custom Code |
| modules/slider-video-lightbox.js | Slider video previews + Bunny lightbox | Site head |
| modules/bunny-player.js | Bunny MP4 player (Section / Hero video) | Global Custom Code embed |
| modules/layer-stack.js | Section / Layers partial sticky stack | Section / Layers embed |
| modules/fade-slider.js | Section / Testimonials fade slider | Section / Testimonials embed |
| modules/capability-table.js | Section / Capabilities collapsible groups | Section / Capabilities embed |
| modules/faq.js | Section / FAQ accordion: top item open, optional one-open-at-a-time, ARIA (CMS FAQs) | Section / FAQ embed |
| modules/draggable-marquee.js | Section / Hero marquee: one-way draggable image marquee + horizontal image parallax | Section / Hero marquee embed |
| modules/image-slider.js | Section / Slider: centred looping image slider with growing progress bars, arrows, drag and keyboard (uses horizontalLoop). Optional autoplay via data-slider-autoplay="true" + data-slider-autoplay-duration; the active bar fills over the interval and pauses on hover over the track, keyboard focus, off screen; stop/start button for keyboard users | Section / Slider embed |
| modules/resource-library.js | Section / Resources: type filter tabs (data-resources-filter) and client-side pagination (data-resources-per-page) for the Resources collection list; reads each card's [data-resource-type] text | Section / Resources embed |

## Working on a script

1. Edit the file in `src/`.
2. New file? Add it to the `order` list in `build.js` (the build fails if a file is missing from the list).
3. `npm install` (first time only), then `npm run build`.
4. Commit `src/` and `dist/`.

## Releasing to the site

The site loads the bundle pinned to a commit, so jsDelivr serves an immutable file and a publish never picks up half-finished work.

```
https://cdn.jsdelivr.net/gh/PatrickHuijs/sinpex-webflow@<commit>/dist/sinpex.min.js
```

1. Bump `version` in `package.json`, run `npm run build`, commit and push.
2. Copy the full commit hash (`git rev-parse HEAD`).
3. In Webflow footer custom code, replace the hash in the script URL and publish.

Prefer tags? Create a release in GitHub (e.g. `v1.0.1`) and use `@v1.0.1` in the URL instead of the hash.

Testing without a release: point the footer at `@main` temporarily, then purge the cache at
`https://purge.jsdelivr.net/gh/PatrickHuijs/sinpex-webflow@main/dist/sinpex.min.js`.

## Load order on the site

1. GSAP + plugins (Webflow GSAP integration)
2. Barba and Lenis (jsDelivr npm, in the footer)
3. `dist/sinpex.min.js`

The bundle keeps top-level function names global, so `initPageScripts()` and the Barba hooks keep working after minification.
