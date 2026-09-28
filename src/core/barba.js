/*
 * Barba page transitions and lifecycle hooks.
 *
 * - 'fade-slide-transition' runs between different pages.
 * - 'self' runs when a link points to the page you are already on (e.g. clicking
 *   Solutions on the Solutions page). Without it Barba ignores the click and the
 *   browser does a full reload, which shows as a hard blink.
 * - Same-page anchor links (#section) are left to the browser so they still jump.
 */
function pageLeave(data) {
  return gsap.to(data.current.container, {
    opacity: 0,
    y: -20,
    duration: 0.3
  });
}

function pageEnter(data) {
  lenis.scrollTo(0, { immediate: true });

  // NOTE: nav variant is not set here. The theme-by-section script is the
  // single owner of the variant and runs on beforeEnter, so there is no
  // competing double-set / flicker.

  gsap.from(data.next.container, {
    opacity: 0,
    y: 20,
    duration: 0.4,
    ease: 'power2.out'
  });
}

// True for links to the current page that carry a #hash: let the browser handle those
function isSamePageAnchor(href) {
  if (!href || href.indexOf('#') === -1) return false;
  try {
    var url = new URL(href, window.location.href);
    return url.pathname === window.location.pathname && url.search === window.location.search;
  } catch (e) {
    return false;
  }
}

// A #hash change also fires popstate, which Barba would treat as a same-page
// navigation and run the 'self' transition. Registered before barba.init so it
// runs first and can stop Barba from seeing hash-only changes.
var barbaLastHref = window.location.href;
window.addEventListener('popstate', function (e) {
  var prev = new URL(barbaLastHref);
  var next = new URL(window.location.href);
  barbaLastHref = window.location.href;
  if (prev.pathname === next.pathname && prev.search === next.search && prev.hash !== next.hash) {
    e.stopImmediatePropagation();
  }
});

barba.init({
  prevent: ({ href }) => isSamePageAnchor(href),
  transitions: [
    {
      name: 'fade-slide-transition',
      leave: pageLeave,
      enter: pageEnter
    },
    {
      name: 'self',
      leave: pageLeave,
      enter: pageEnter
    }
  ]
});

// The moment a navigation starts, close the mobile menu smoothly so it
// slides shut in sync with the page leaving instead of snapping.
barba.hooks.beforeLeave(() => {
  if (typeof window.closeNavMenu === 'function') window.closeNavMenu();
});

// Tear down the old page's listeners before the new one initialises,
// and guarantee the menu is fully reset before the new page paints.
barba.hooks.beforeEnter(() => {
  runPageCleanups();
  if (typeof window.resetNavMenu === 'function') window.resetNavMenu();
  if (window.lenis && window.lenis.start) window.lenis.start();
  document.body.style.overflow = '';
});

barba.hooks.after(() => {
  barbaLastHref = window.location.href;
  initPageScripts();
});
