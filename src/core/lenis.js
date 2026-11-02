/*
 * Lenis, initialised once and synced with ScrollTrigger.
 *
 * Mouse wheel, trackpad and touch are native browser scrolling (smoothWheel and syncTouch off).
 * Lenis stays for what the site calls on it: scrollTo (page transitions, back to top, nav, pagination),
 * stop/start (scroll locks) and its scroll event. lerp only applies to those scrollTo calls.
 */
const lenis = new Lenis({
  lerp: 0.07,
  smoothWheel: false,
  syncTouch: false
});

window.lenis = lenis;

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);
