/*
 * Hero image scale on scroll.
 */
function initHeroImageScale() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelectorAll("[data-wf--section-hero-full-image--variant]").forEach((section) => {
    const bg = section.querySelector(".section_bg");
    const img = section.querySelector(".section_bg .img-abs");
    if (!bg || !img) return;

    gsap.set(bg, { overflow: "hidden" });
    gsap.set(img, { transformOrigin: "50% 50%", willChange: "transform" });

    gsap.fromTo(img, { scale: 1 }, {
      scale: 1.15,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });
  });
}
