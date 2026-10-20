/*
 * Cards stagger in on scroll.
 *
 * Wrapper: [data-scroll-stagger="wrapper"]
 * Items:   [data-scroll-stagger="item"] inside the wrapper
 *
 * Optional on the wrapper:
 *   data-scroll-stagger-scrub="true"  ties the stagger to the scroll position
 *   (value is not case-sensitive; anything else, or no attribute, plays once)
 */
function initCardsStagger() {
  gsap.utils.toArray("[data-scroll-stagger=wrapper]").forEach(wrapper => {
    const items = wrapper.querySelectorAll("[data-scroll-stagger=item]");
    if (!items.length) return;

    const scrubValue = (wrapper.getAttribute("data-scroll-stagger-scrub") || "").trim().toLowerCase();
    const isScrub = scrubValue === "true";

    if (isScrub) {
      // Trigger on the items' own container so the stagger runs while the cards are in view,
      // not while the section header above them is still scrolling in.
      const trigger = items[0].parentElement || wrapper;

      gsap.fromTo(
        items,
        { y: "15%", opacity: 0 },
        {
          y: "0%",
          opacity: 1,
          ease: "none",
          stagger: 0.15,
          scrollTrigger: {
            trigger: trigger,
            start: "top 90%",
            end: "top 45%",
            scrub: true,
          },
        }
      );
      return;
    }

    gsap.fromTo(
      items,
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
