/*
 * Nav: base/dark theme switch by section on scroll.
 * - Every section with a data-wf--section…--variant attribute counts; a variant name containing "dark" makes the nav dark
 *   while that section sits under the navbar centre line.
 * - Barba keeps both pages in the DOM from beforeEnter until after enter: the old container is only removed just before
 *   the 'after' hook, and it still sits above the new one in the layout. So on beforeEnter the new page's sections are
 *   scanned from data.next.container (not the first container in the DOM, which is the old page) and measured as they
 *   will sit once the old page is gone and the scroll is back at the top. The nav is themed before the new page fades in,
 *   with no second switch afterwards.
 * - 'after' re-scans once the old page is gone, so scrolling on the new page always reads the live sections.
 */
(function () {
  var DARK = 'dark-mode',
      VARIANT_CLASS = 'w-variant-e6ad70a9-35a7-3757-addd-ca744bb9940d'; // Nav "Dark mode" variant
  var nav = null, sections = [], last = null, line = 60, leaving = null;

  function css() {
    if (document.getElementById('nav-theme-css')) return;
    var s = document.createElement('style');
    s.id = 'nav-theme-css';
    s.textContent =
      '.navbar_container{transition:color .3s ease}' +
      '.navbar_logo-svg path{transition:fill .3s ease}' +
      // while the menu is open, force logo + hamburger dark so they read on the white panel
      '.nav_component[data-menu-open="1"] .navbar{background-color:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' +
      '.nav_component[data-menu-open="1"] .navbar_container{color:var(--_swatches---swatch--030b12-100)!important}';
    document.head.appendChild(s);
  }

  // The page the nav should follow: the given container, else the last one in the DOM (the newest page)
  function scan(container) {
    nav = document.querySelector('.nav_component');
    sections = [];
    var all = document.querySelectorAll('[data-barba="container"]'),
        scope = container || all[all.length - 1] || document.body,
        found = scope.getElementsByTagName('section');
    for (var i = 0; i < found.length; i++) {
      var el = found[i], attrs = el.attributes;
      for (var j = 0; j < attrs.length; j++) {
        var n = attrs[j].name;
        if (n.indexOf('data-wf--section') === 0 && n.slice(-9) === '--variant') {
          sections.push({ el: el, dark: /dark/i.test(attrs[j].value) });
          break;
        }
      }
    }
  }

  function measure() {
    var bar = nav && nav.querySelector('.navbar');
    line = bar ? bar.getBoundingClientRect().top + bar.offsetHeight / 2 : 60; // switch line = navbar centre
  }

  // While the old page is still in the DOM, the new page sits below it: measure the new sections as they will sit
  // once the old page is removed and the scroll is at the top (shift = old page height - current scroll).
  function shift() {
    if (!leaving || !leaving.isConnected) {
      leaving = null;
      return 0;
    }
    return leaving.offsetHeight - window.scrollY;
  }

  function update() {
    if (!nav) return;
    var offset = shift(), dark = false;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].el.getBoundingClientRect();
      if (r.top - offset <= line && r.bottom - offset > line) dark = sections[i].dark;
    }
    if (dark === last) return;
    last = dark;
    nav.setAttribute('data-wf--nav--variant', dark ? DARK : 'default');
    nav.classList.toggle(VARIANT_CLASS, dark);
  }

  function init(container) { last = null; css(); scan(container); measure(); update(); }

  function boot() {
    if (window.lenis && window.lenis.on) window.lenis.on('scroll', update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { measure(); update(); });
    if (window.barba && window.barba.hooks) {
      // Theme the nav from the new page before it fades in (single owner, no late second switch)
      window.barba.hooks.beforeEnter(function (data) {
        leaving = (data && data.current && data.current.container) || null;
        init(data && data.next && data.next.container);
      });
      // Old page removed: drop the shift and re-scan the live page. Same result, so no visible change.
      window.barba.hooks.after(function () {
        leaving = null;
        scan();
        measure();
        update();
      });
    }
    init();
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
