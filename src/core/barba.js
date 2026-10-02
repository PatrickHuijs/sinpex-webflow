/*
 * Barba page transitions and lifecycle hooks.
 *
 * - 'fade-slide-transition' runs between different pages.
 * - 'self' runs when a link points to the page you are already on (e.g. clicking
 *   Solutions on the Solutions page). Without it Barba ignores the click and the
 *   browser does a full reload, which shows as a hard blink.
 * - With the mobile menu open, the leave first waits for the menu to close (window.closeNavMenu() returns a promise).
 *   A menu link to the current page never gets here: nav-menu.js closes the menu and scrolls to the top instead.
 * - Same-page anchor links (#section) are left to the browser so they still jump.
 */
function pageLeave(data) {
  // An open mobile menu slides shut first; the page only starts leaving once it is closed.
  var closed = typeof window.closeNavMenu === 'function' ? window.closeNavMenu() : null;
  return Promise.resolve(closed).then(function () {
    return new Promise(function (resolve) {
      gsap.to(data.current.container, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        onComplete: resolve
      });
    });
  });
}

function pageEnter(data) {
  lenis.scrollTo(0, { immediate: true, force: true }); // force: also when the menu holds the scroll lock

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

// Barba controls scroll position (top on every page change), not the browser
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

barba.init({
  preventRunning: true, // a second click while a transition runs is ignored instead of forcing a full reload
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

// Tear down the old page's listeners before the new one initialises.
// Scroll is released here, unless the visitor opened the mobile menu again during the transition.
barba.hooks.beforeEnter(() => {
  runPageCleanups();
  const menuOpen = typeof window.isNavMenuOpen === 'function' && window.isNavMenuOpen();
  if (!menuOpen) {
    if (window.lenis && window.lenis.start) window.lenis.start();
    document.body.style.overflow = '';
  }
});

// Webflow only binds its own features (native forms, interactions, tabs, dropdowns) on a full page load.
// After a Barba swap: copy the new page's data-wf-page onto <html> and re-run Webflow on the new container.
function reinitWebflow(next) {
  const match = next && next.html ? next.html.match(/data-wf-page="([^"]+)"/) : null;
  if (match) document.documentElement.setAttribute('data-wf-page', match[1]);
  if (!window.Webflow) return;
  try {
    window.Webflow.destroy();
    window.Webflow.ready();
    const ix2 = window.Webflow.require('ix2');
    if (ix2 && typeof ix2.init === 'function') ix2.init();
  } catch (e) {
    console.warn('[webflow reinit failed]', e);
  }
}

barba.hooks.after((data) => {
  barbaLastHref = window.location.href;
  reinitWebflow(data && data.next);
  initPageScripts();
});
