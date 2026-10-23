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
 * - Language changes (locale switcher, links between / and /de/, back/forward across them) are full page loads,
 *   because the nav, footer and <html lang> live outside the Barba container.
 * - After every swap the language switch links are copied from the new page, so the switch always points to the
 *   current page in the other language (not to the page of the last full load).
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

// Locale of a path: the first segment when it is a secondary locale subdirectory (/de/...), '' for the primary locale.
// Barba only swaps [data-barba="container"]; the nav (with the language switch), the footer and <html lang> sit outside it,
// so a change of language must be a full page load, otherwise those parts stay in the old language.
var LOCALE_DIRS = ['de'];
function localeOf(pathname) {
  var first = (pathname || '/').split('/')[1] || '';
  return LOCALE_DIRS.indexOf(first.toLowerCase()) !== -1 ? first.toLowerCase() : '';
}

// True for links that switch language: a Webflow locale switcher link, or any link into another locale
function isLocaleChange(href, el) {
  if (el && el.closest && el.closest('.w-locales-list, .lang-toggle, [hreflang]')) return true;
  if (!href) return false;
  try {
    var url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return localeOf(url.pathname) !== localeOf(window.location.pathname);
  } catch (e) {
    return false;
  }
}

// A #hash change also fires popstate, which Barba would treat as a same-page
// navigation and run the 'self' transition. Registered before barba.init so it
// runs first and can stop Barba from seeing hash-only changes.
// Back/forward into another language reloads the page, for the same reason as above.
var barbaLastHref = window.location.href;
window.addEventListener('popstate', function (e) {
  var prev = new URL(barbaLastHref);
  var next = new URL(window.location.href);
  barbaLastHref = window.location.href;
  if (localeOf(prev.pathname) !== localeOf(next.pathname)) {
    e.stopImmediatePropagation();
    window.location.reload();
    return;
  }
  if (prev.pathname === next.pathname && prev.search === next.search && prev.hash !== next.hash) {
    e.stopImmediatePropagation();
  }
});

// Barba controls scroll position (top on every page change), not the browser
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

barba.init({
  preventRunning: true, // a second click while a transition runs is ignored instead of forcing a full reload
  prevent: ({ el, href }) => isSamePageAnchor(href) || isLocaleChange(href, el),
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

// The language switch lives in the nav, outside the Barba container, so after a swap its links still point to the
// page that was loaded first (a hard refresh on /faqs keeps sending the switch to /de/faqs). Copy the switch links
// (href, current state) from the new page's HTML so the switch always leads to the same page in the other language.
function syncLocaleSwitcher(next) {
  if (!next || !next.html) return;
  var current = Array.from(document.querySelectorAll('.w-locales-list a, .lang-toggle a'));
  if (!current.length) return;
  var incoming;
  try {
    incoming = Array.from(new DOMParser().parseFromString(next.html, 'text/html').querySelectorAll('.w-locales-list a, .lang-toggle a'));
  } catch (e) {
    return;
  }
  if (!incoming.length) return;
  current.forEach(function (link, i) {
    var lang = link.getAttribute('hreflang');
    var match = (lang && incoming.find(function (a) { return a.getAttribute('hreflang') === lang; })) || incoming[i];
    if (!match) return;
    link.setAttribute('href', match.getAttribute('href'));
    link.classList.toggle('w--current', match.classList.contains('w--current'));
    if (match.hasAttribute('aria-current')) link.setAttribute('aria-current', match.getAttribute('aria-current'));
    else link.removeAttribute('aria-current');
  });
}

barba.hooks.after((data) => {
  barbaLastHref = window.location.href;
  syncLocaleSwitcher(data && data.next);
  reinitWebflow(data && data.next);
  initPageScripts();
});
