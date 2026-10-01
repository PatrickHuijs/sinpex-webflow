/*
 * Master init: runs every page-level init on first load and after each Barba transition. Must load last.
 */
function safeInit(fn) {
  try { fn(); } catch (e) { console.warn('[init failed]', fn.name, e); }
}

function initPageScripts() {
  runPageCleanups();
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());

  document.fonts.ready.then(() => safeInit(initMaskTextScrollReveal));

  [
    initButtonIconRecolour,
    initSwiperAccessibility,
    initCSSMarquee,
    initSliders,
    initHeroImageScale,
    initCardsStagger,
    initFadeInReveal,
    initNumberOdometer,
    initDividerGrowReveal,
    initParallaxImages,
    initBackToTop,
    initLogoWallCycle,
    initCardStack,
    initCapabilityTable,
    initFaq,
    initDraggableMarquee,
    initImageSlider
  ].forEach(safeInit);

  ScrollTrigger.refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  initPageScripts();
});
