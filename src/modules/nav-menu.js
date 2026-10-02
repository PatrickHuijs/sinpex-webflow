/*
 * Nav: mobile menu and scroll background.
 * Markup (Nav component, sits outside the Barba container so it is built once):
 *   .nav_component > .nav_trigger (hamburger), .nav_mobile > .nav_overlay + .nav_menu > .nav_menu_link (CMS links) + .nav_menu_actions (buttons)
 * - The menu has one state (open or not) and every animation is a plain tween that overwrites the one before it,
 *   so opening, closing and page changes can interrupt each other in any order without the panel getting stuck.
 * - Closing returns a promise. The Barba leave waits for it, so the panel slides shut first and the page changes after.
 * - A link to the page you are already on (menu open) only closes the menu and scrolls to the top: no page transition.
 * - Any link inside the nav closes the menu (CMS links, the two buttons, the logo).
 * - Also closes on Escape, on resize to desktop and when the page comes back from the browser's back/forward cache.
 * - The trigger is a div in Webflow: it gets role="button", tabindex, aria-expanded and Enter/Space here.
 * Exposes window.closeNavMenu() (smooth, returns a promise), window.resetNavMenu() (instant) and window.isNavMenuOpen().
 */
function initNav() {
  var nav = document.querySelector('.nav_component');
  if (!nav || nav.dataset.navInit) return;
  nav.dataset.navInit = '1';

  if (!document.getElementById('nav-scroll-css')) {
    var s = document.createElement('style');
    s.id = 'nav-scroll-css';
    s.textContent =
      '.navbar{transition:background-color .3s ease,backdrop-filter .3s ease,-webkit-backdrop-filter .3s ease,margin .3s ease}' +
      '.nav_component .navbar{background-color:rgba(255,255,255,.1);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
      '.nav_component[data-wf--nav--variant="dark-mode"] .navbar{background-color:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}' +
      '.nav_component[data-wf--nav--variant="dark-mode"][data-nav-scrolled="true"] .navbar{background-color:rgba(3,11,18,.05);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
      '.nav_menu_link{display:inline-block}' +          /* lets the links transform (slide) */
      '.nav_menu_actions>*{width:100%}' +
      '.nav_trigger{cursor:pointer}';
    document.head.appendChild(s);
  }

  var onScroll = function () {
    var y = window.lenis ? window.lenis.scroll : window.scrollY;
    nav.setAttribute('data-nav-scrolled', y > 40 ? 'true' : 'false');
  };
  onScroll();
  if (window.lenis && window.lenis.on) window.lenis.on('scroll', onScroll);
  else window.addEventListener('scroll', onScroll, { passive: true });

  var menu  = nav.querySelector('.nav_menu'),
      ov    = nav.querySelector('.nav_overlay'),
      trg   = nav.querySelector('.nav_trigger'),
      links = nav.querySelectorAll('.nav_menu_link');
  if (!menu || typeof gsap === 'undefined') return;

  /* ============ TWEAK THE ANIMATION HERE ============ */
  var OPEN_DURATION = 0.7;   // panel slide-in (seconds)
  var CLOSE_DURATION = 0.45; // panel slide-out (seconds); a page change waits for this
  /* ================================================== */

  var isOpen = false;
  var closing = null;     // promise of the close that is running, if any
  var settleClose = null; // resolves that promise
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width: 992px)'); // .nav_mobile is hidden from here up

  function lockScroll(on) {
    if (on) {
      if (window.lenis && window.lenis.stop) window.lenis.stop();
      document.body.style.overflow = 'hidden';
    } else {
      if (window.lenis && window.lenis.start) window.lenis.start();
      document.body.style.overflow = '';
    }
  }

  function setOpenAttributes(on) {
    nav.setAttribute('data-menu-open', on ? '1' : '0');
    if (trg) trg.setAttribute('aria-expanded', on ? 'true' : 'false');
  }

  // The fully closed state, set in one place
  function snapShut() {
    gsap.killTweensOf([menu, ov]);
    gsap.killTweensOf(links);
    gsap.set(menu, { x: 0, xPercent: 100 });
    if (ov) gsap.set(ov, { opacity: 0 });
    gsap.set(links, { autoAlpha: 0 });
    menu.style.visibility = 'hidden';
    setOpenAttributes(false);
  }

  function finishClose() {
    var settle = settleClose;
    closing = null;
    settleClose = null;
    if (settle) settle();
  }

  function openMenu() {
    if (isOpen) return;
    isOpen = true;
    finishClose(); // a close that was still running is taken over
    setOpenAttributes(true);
    if (ov) ov.style.pointerEvents = 'auto';
    lockScroll(true);
    menu.style.visibility = 'visible';

    if (reduceMotion.matches) {
      gsap.killTweensOf([menu, ov]);
      gsap.killTweensOf(links);
      gsap.set(menu, { x: 0, xPercent: 0 });
      if (ov) gsap.set(ov, { opacity: 0.6 });
      gsap.set(links, { x: 0, autoAlpha: 1 });
      return;
    }
    gsap.to(menu, { x: 0, xPercent: 0, duration: OPEN_DURATION, ease: 'power3.out', overwrite: true });   // panel slide-in
    if (ov) gsap.to(ov, { opacity: 0.6, duration: 0.5, ease: 'power2.out', overwrite: true });            // scrim dim
    gsap.fromTo(links,
      { x: -48, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.6, stagger: 0.09, ease: 'power3.out', delay: 0.25, overwrite: true });
  }

  // Returns a promise that resolves when the panel is shut. instant = true skips the animation.
  function closeMenu(instant) {
    if (!isOpen) {
      if (instant) { snapShut(); finishClose(); }
      return closing || Promise.resolve();
    }
    isOpen = false;
    if (ov) ov.style.pointerEvents = 'none';
    lockScroll(false);
    if (trg && menu.contains(document.activeElement)) trg.focus({ preventScroll: true });

    if (instant || reduceMotion.matches) {
      snapShut();
      finishClose();
      return Promise.resolve();
    }

    if (trg) trg.setAttribute('aria-expanded', 'false');
    gsap.to(links, { autoAlpha: 0, duration: 0.2, overwrite: true });
    if (ov) gsap.to(ov, { opacity: 0, duration: CLOSE_DURATION, ease: 'power2.out', overwrite: true });

    closing = new Promise(function (resolve) {
      var finished = false;
      var done = function () {
        if (finished) return;
        finished = true;
        if (!isOpen) snapShut(); // not reopened in the meantime
        if (settleClose === done) finishClose();
        resolve();
      };
      settleClose = done;
      gsap.to(menu, { x: 0, xPercent: 100, duration: CLOSE_DURATION, ease: 'power3.inOut', overwrite: true, onComplete: done });
      // Safety net: a throttled background tab or a killed tween can never leave a page change waiting
      setTimeout(done, CLOSE_DURATION * 1000 + 300);
    });
    return closing;
  }

  // Expose for Barba: the leave waits for closeNavMenu(), resetNavMenu() is the instant version.
  window.closeNavMenu = function () { return closeMenu(false); };
  window.resetNavMenu = function () { return closeMenu(true); };
  window.isNavMenuOpen = function () { return isOpen; };

  function cleanPath(pathname) {
    return pathname.replace(/\/+$/, '') || '/';
  }

  // True when the link points at the page that is showing now (no #section)
  function isCurrentPage(link) {
    try {
      var url = new URL(link.href, window.location.href);
      return url.origin === window.location.origin &&
        cleanPath(url.pathname) === cleanPath(window.location.pathname) &&
        url.search === window.location.search &&
        !url.hash;
    } catch (e) {
      return false;
    }
  }

  snapShut();

  if (trg) {
    trg.setAttribute('role', 'button');
    trg.setAttribute('tabindex', '0');
    if (!trg.hasAttribute('aria-label')) trg.setAttribute('aria-label', 'Menu');
    trg.addEventListener('click', function () { isOpen ? closeMenu() : openMenu(); });
    trg.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      isOpen ? closeMenu() : openMenu();
    });
  }
  if (ov) ov.addEventListener('click', function () { closeMenu(); });

  // Every link inside the nav while the menu is open
  nav.addEventListener('click', function (e) {
    if (!isOpen) return;
    var link = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!link || !nav.contains(link)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || link.target === '_blank') return; // opens elsewhere: leave the menu as it is

    var raw = link.getAttribute('href') || '';
    if (raw === '#') {
      // Placeholder link: just close
      e.preventDefault();
      e.stopPropagation();
      closeMenu();
      return;
    }
    if (isCurrentPage(link)) {
      // Already on this page: close the menu and go to the top, without a page transition
      e.preventDefault();
      e.stopPropagation(); // keeps the click away from Barba
      closeMenu().then(function () {
        if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      return;
    }
    // Other page: start closing now. Barba's leave waits for the same close before the page changes.
    closeMenu();
  });

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  var onDesktop = function () { if (desktop.matches) closeMenu(true); };
  if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', onDesktop);
  else if (typeof desktop.addListener === 'function') desktop.addListener(onDesktop);

  // Back from the browser's back/forward cache with the menu still open
  window.addEventListener('pageshow', function (e) { if (e.persisted) closeMenu(true); });
}

if (document.readyState !== 'loading') initNav();
else document.addEventListener('DOMContentLoaded', initNav);
