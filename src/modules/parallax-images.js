/*
 * Parallax images.
 */
function initParallaxImages() {
  // Reduced motion: images stay still
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.utils.toArray('[data-img-parallax="trigger"][data-animation="true"]').forEach(trigger => {
    const target = trigger.querySelector('[data-img-parallax="target"]');
    if (!target) return;

    const strength = parseFloat(trigger.getAttribute('data-parallax')) || 5;
    const dir = trigger.getAttribute('data-direction') === 'reverse' ? -1 : 1;

    gsap.fromTo(
      target, { y: `${strength * dir}%` },
      {
        y: `${-strength * dir}%`,
        ease: 'none',
        scrollTrigger: {
          trigger,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true
        }
      }
    );
  });
}
