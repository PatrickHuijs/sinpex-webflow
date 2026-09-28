/*
 * Nav: mobile menu and scroll background.
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
      '.nav_menu_actions>*{width:100%}';
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

  var open = false;

  /* ============ TWEAK THE ANIMATION HERE ============ */
  var closeSpeed = 1.3; // higher = closes faster

  // Panel + scrim (reverses instantly on close)
  var tl = gsap.timeline({ paused: true, onReverseComplete: function () { menu.style.visibility = 'hidden'; } });
  tl.set(menu, { visibility: 'visible', x: 0, xPercent: 100 }, 0)
    .to(ov,   { opacity: 0.6, duration: 0.5, ease: 'power2.out' }, 0)          // scrim dim
    .to(menu, { x: 0, xPercent: 0, duration: 0.7, ease: 'power3.out' }, 0);    // panel slide-in

  // Links slide in from the left (open only, so close isn't delayed)
  function animateLinksIn() {
    gsap.fromTo(links,
      { x: -48, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.6, stagger: 0.09, ease: 'power3.out', delay: 0.25, overwrite: true });
  }
  /* ================================================== */

  function openMenu() {
    if (open) return;
    open = true;
    nav.setAttribute('data-menu-open', '1');
    ov.style.pointerEvents = 'auto';
    if (window.lenis && window.lenis.stop) window.lenis.stop();
    document.body.style.overflow = 'hidden';
    tl.timeScale(1).play();
    animateLinksIn();
  }

  // instant = true snaps the panel shut with no animation (used as a
  // guaranteed reset when a new page is entering).
  function closeMenu(instant) {
    if (!open && !instant) return;
    open = false;
    nav.setAttribute('data-menu-open', '0');
    if (ov) ov.style.pointerEvents = 'none';
    if (window.lenis && window.lenis.start) window.lenis.start();
    document.body.style.overflow = '';

    if (instant) {
      gsap.killTweensOf(links);
      gsap.set(links, { autoAlpha: 0 });
      tl.pause().progress(0);
      menu.style.visibility = 'hidden';
      return;
    }

    gsap.to(links, { autoAlpha: 0, duration: 0.2, overwrite: true });
    tl.timeScale(closeSpeed).reverse();
  }

  // Expose for Barba: smooth close on leave, hard reset on enter.
  window.closeNavMenu = function () { closeMenu(false); };
  window.resetNavMenu = function () { closeMenu(true); };

  if (trg) trg.addEventListener('click', function () { open ? closeMenu() : openMenu(); });
  if (ov) ov.addEventListener('click', function () { closeMenu(); });
  links.forEach(function (l) { l.addEventListener('click', function () { closeMenu(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
}

if (document.readyState !== 'loading') initNav();
else document.addEventListener('DOMContentLoaded', initNav);
