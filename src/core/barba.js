/*
 * Barba page transitions and lifecycle hooks.
 */
barba.init({
  transitions: [
    {
      name: 'fade-slide-transition',
      leave(data) {
        return gsap.to(data.current.container, {
          opacity: 0,
          y: -20,
          duration: 0.3
        });
      },
      enter(data) {
        lenis.scrollTo(0, { immediate: true });

        // NOTE: nav variant is no longer set here. The theme-by-section
        // script (below) is the single owner of the variant and runs on
        // beforeEnter, so there is no competing double-set / flicker.

        gsap.from(data.next.container, {
          opacity: 0,
          y: 20,
          duration: 0.4,
          ease: 'power2.out'
        });
      }
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
  initPageScripts();
});
