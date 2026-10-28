# Sinpex Webflow scripts

All custom JavaScript for the Sinpex Webflow site. CSS stays in Webflow (site head, Global Custom Code and section embeds). Scripts are bundled into one file and served from GitHub through jsDelivr.

## Structure

```
src/
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
| core/barba.js | Page transitions and lifecycle hooks; the leave waits for the mobile menu to close; clicks during a running transition are ignored; re-runs Webflow (data-wf-page, forms, IX2) after each swap; manual scroll restoration; language changes (locale switcher, links between `/` and `/de/`, back/forward across them) are full page loads because nav, footer and `<html lang>` sit outside the container; after each swap the language switch links (href, current state) are copied from the new page so the switch keeps pointing at the current page | – |
| core/master-init.js | `initPageScripts()`: runs every page init, first load and after each transition. Loads last. | – |
| modules/card-stack.js | Platform card stack | Global Custom Code |
| modules/metrics-counter.js | Number odometer | Site footer + Global Custom Code |
| modules/text-split.js | Masked text reveal | Site head |
| modules/nav-menu.js | Mobile menu + scroll background. Closes before a page change; a menu link to the current page only closes the menu and scrolls to the top | – |
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
| modules/layer-stack.js | Section / Layers full sticky stack: every row sticks at the same top and fully covers the previous one; all rows release together | Section / Layers embed |
| modules/fade-slider.js | Section / Testimonials fade slider | Section / Testimonials embed |
| modules/capability-table.js | Section / Capabilities collapsible groups | Section / Capabilities embed |
| modules/faq.js | Section / FAQ accordion: top item open, optional one-open-at-a-time, ARIA (CMS FAQs) | Section / FAQ embed |
| modules/draggable-marquee.js | Section / Hero marquee: one-way draggable image marquee + horizontal image parallax | Section / Hero marquee embed |
| modules/image-slider.js | Section / Slider: centred looping image slider with horizontal image parallax (data-slider-parallax), growing progress bars, arrows, drag and keyboard (uses horizontalLoop). Optional autoplay via data-slider-autoplay="true" + data-slider-autoplay-duration; the active bar fills over the interval and pauses on hover over the track, keyboard focus, off screen; stop/start button for keyboard users | Section / Slider embed |
| modules/resource-library.js | Section / Resources: fade transition between filters/pages, type filter tabs (data-resources-filter) and client-side pagination (data-resources-per-page) for the Resources collection list; reads each card's [data-resource-type] text | Section / Resources embed |
| modules/webinar-slider.js | Section / Webinar spotlight: left-aligned CMS slider (drag, prev/next, keys, one progress bar per stop) with All / Upcoming / On demand filters (data-webinars-filter); mobile: stacked list, 3 at a time + Load More (data-webinars="more"); sorted furthest date first; status from each card's [data-resource-date] text by calendar day, today counts as upcoming | Section / Webinar spotlight embed |
| modules/resource-slider.js | Resources CMS only / Article image slider: fills the empty slider inside an article's rich text ([data-resource-slider="target"]) with the images of the item's Slider images field, read from a hidden Collection List on the Resources template ([data-resource-slider="source"]); images keep their own proportions (fixed height, auto width) and the slider starts once they have loaded; 1 image shows as a static centred image without controls, no images removes the slider; runs before image-slider.js | Resources CMS only / Article image slider embed |
| modules/resource-external-link.js | Resources external link override: an element with [data-external-link] (bound to the Resources External link field, set on the Collection Item of each Resources list) sends every link inside it to that URL in a new tab; empty value keeps the detail page link | – |
| modules/external-links.js | Links to another site (different host, www. ignored) open in a new tab with rel="noopener noreferrer"; links that already have a target are skipped; opt out with data-new-tab="false" on the link or a parent | – |
| modules/resource-cta-labels.js | Resources German CTA labels: on German pages (`<html lang>` starts with `de`) swaps the conditional CTAs Read article / Watch webinar / Read story for Artikel lesen / Webinar ansehen / Story lesen. Site-wide, only in button label layers (.button_text, .button_link_text, .clickable_text); exact labels only | – |
| modules/current-year.js | Copyright year: on [data-current-year] (Footer copyright block) replaces the last four-digit year in the text with the current year; the rest of the text stays as typed | – |
| modules/hubspot-modals.js | HubSpot meetings popups (Modal / HubSpot component: book-a-demo-en/-de, book-a-demo-pricing-en/-de). Opens from the Popup prop on buttons ([data-modal-open] = popup name) or from links pointing to a popup's HubSpot URL; empty Popup follows the link. Native dialog, iframe built on first open, X / Escape / overlay close, focus return, scroll lock (Lenis stopped). Modifier clicks and no-JS follow the link | Global Custom Code (MODALS embed) |
| modules/hubspot-forms.js | HubSpot forms, developer embed (div.hs-form-html with data-region / data-portal-id / data-form-id): the form renders as HTML in the page so the site CSS styles it. Used by the Sign-up, On-demand and Event form in the webinar hero (Resources template, conditional visibility per CMS field) and by Section / Newsletter (HubSpot form ID prop, DE form in the DE locale). Adds the developer loader once, only on a page with a form; after a Barba page change re-inserts each form HubSpot has not picked up (the loader only renders elements that are themselves added). Never load the iframe loader next to it | Global Custom Code > HubSpot forms (base, --hsf-* variables + hsfc rules); section overrides in the section embed (Newsletter) |
| modules/layer-video.js | Layer feature MP4 on video[data-layer-video][data-layer-video-src] (Video URL prop, .mp4 on Bunny). Muted loop, loads half a viewport early, plays in view, pauses out of view; the image stays until the first frame plays ([data-layer-video-status="playing"]); reduced motion keeps the image; [data-layer-video-failed] on load error so the image stays | Section / Layer features embed |

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
