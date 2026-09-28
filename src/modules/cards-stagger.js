/*
 * Cards stagger in on scroll.
 */
function initCardsStagger() {
  gsap.utils.toArray("[data-scroll-stagger=wrapper]").forEach(wrapper => {
    gsap.fromTo(
      wrapper.querySelectorAll("[data-scroll-stagger=item]"),
      { y: "15%", opacity: 0 },
      {
        y: "0%",
        opacity: 1,
        stagger: 0.1,
        scrollTrigger: {
          trigger: wrapper,
          start: "top bottom",
          end: "top center",
          scrub: false,
        },
      }
    );
  });
}
