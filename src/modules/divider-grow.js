/*
 * Divider grow reveal on scroll.
 */
function initDividerGrowReveal() {
  gsap.utils.toArray(".divider-horizontal").forEach(divider => {
    gsap.fromTo(
      divider, { width: "0%" },
      {
        width: "100%",
        duration: 1.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: divider,
          start: "top 90%",
          toggleActions: "play none none reverse"
        }
      }
    );
  });
}
