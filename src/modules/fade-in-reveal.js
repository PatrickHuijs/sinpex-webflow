/*
 * Fade-in reveal on scroll.
 */
function initFadeInReveal() {
  gsap.utils.toArray("[data-scroll-fade]").forEach(el => {
    gsap.fromTo(
      el, { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          toggleActions: "play none none none"
        }
      }
    );
  });
}
