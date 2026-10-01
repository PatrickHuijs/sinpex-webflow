/*
 * Section / FAQ: CMS-driven accordion.
 * Markup: [data-faq-item] > button[data-faq-toggle] + [data-faq-answer]
 * The open/close animation is CSS (grid-template-rows) in the Section / FAQ embed; this only manages state and ARIA.
 * The first item opens on load (as in Figma). Opening one item does not close the others.
 */
function initFaq() {
  const items = document.querySelectorAll("[data-faq-item]");
  if (!items.length) return;

  function refreshScroll() {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  items.forEach(function (item, i) {
    const toggle = item.querySelector("[data-faq-toggle]");
    const answer = item.querySelector("[data-faq-answer]");
    if (!toggle || !answer || toggle.dataset.faqBound) return;
    toggle.dataset.faqBound = "true";

    const n = i + 1;
    if (!toggle.id) toggle.id = "faq-toggle-" + n;
    if (!answer.id) answer.id = "faq-answer-" + n;
    toggle.setAttribute("aria-controls", answer.id);
    answer.setAttribute("aria-labelledby", toggle.id);
    toggle.setAttribute("aria-expanded", String(i === 0));

    toggle.addEventListener("click", function () {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
    });

    answer.addEventListener("transitionend", function (e) {
      if (e.target === answer && e.propertyName === "grid-template-rows") refreshScroll();
    });
  });
}
