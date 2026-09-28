/*
 * Lenis smooth scroll, initialised once and synced with ScrollTrigger.
 */
const lenis = new Lenis({
  lerp: 0.07,
  smooth: true,
  smoothTouch: false
});

window.lenis = lenis;

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);
