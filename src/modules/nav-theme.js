/*
 * Nav: base/dark theme switch by section on scroll.
 */
(function () {
  var DARK = 'dark-mode',
      VARIANT_CLASS = 'w-variant-e6ad70a9-35a7-3757-addd-ca744bb9940d'; // Nav "Dark mode" variant
  var nav = null, sections = [], last = null, line = 60;

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

  function scan() {
    nav = document.querySelector('.nav_component');
    sections = [];
    var scope = document.querySelector('[data-barba="container"]') || document.body,
        all = scope.getElementsByTagName('section');
    for (var i = 0; i < all.length; i++) {
      var el = all[i], attrs = el.attributes;
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

  function update() {
    if (!nav) return;
    var dark = false;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) dark = sections[i].dark;
    }
    if (dark === last) return;
    last = dark;
    nav.setAttribute('data-wf--nav--variant', dark ? DARK : 'default');
    nav.classList.toggle(VARIANT_CLASS, dark);
  }

  function init() { last = null; css(); scan(); measure(); update(); }

  function boot() {
    if (window.lenis && window.lenis.on) window.lenis.on('scroll', update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { measure(); update(); });
    // Set the correct variant BEFORE the new page fades in (single owner,
    // no 50ms-late second switch), which is what was causing the flicker.
    if (window.barba && window.barba.hooks) window.barba.hooks.beforeEnter(function () { init(); });
    init();
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
