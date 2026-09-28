/*
 * Masked text reveal on scroll (SplitText).
 */
const splitConfig = {
  lines: { duration: 0.8, stagger: 0.08 },
  words: { duration: 0.6, stagger: 0.06 },
  chars: { duration: 0.4, stagger: 0.01 }
};

function initMaskTextScrollReveal() {
  document.querySelectorAll('[data-split="heading"]').forEach((heading) => {
    gsap.set(heading, { autoAlpha: 1 });

    const type = heading.dataset.splitReveal || "lines";
    const typesToSplit =
      type === "lines" ? ["lines"] :
      type === "words" ? ["lines", "words"] : ["lines", "words", "chars"];

    const instance = SplitText.create(heading, {
      type: typesToSplit.join(", "),
      mask: "lines",
      autoSplit: true,
      linesClass: "line",
      wordsClass: "word",
      charsClass: "letter",
      onSplit: function (self) {
        const targets = self[type];
        const config = splitConfig[type];

        const rect = heading.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight * 0.8;

        return gsap.from(targets, {
          yPercent: 110,
          duration: config.duration,
          stagger: config.stagger,
          ease: "expo.out",
          scrollTrigger: isInViewport ? undefined : {
            trigger: heading,
            start: "clamp(top 80%)",
            once: true
          },
          delay: isInViewport ? 0.1 : 0
        });
      }
    });

    pageCleanups.push(() => { try { instance.revert(); } catch (e) {} });
  });
}
