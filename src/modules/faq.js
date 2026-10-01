/*
 * Section / FAQ: CMS-driven accordion.
 * Markup: [data-faq-item] > button[data-faq-toggle] + [data-faq-answer]
 * The animation is CSS (grid-template-rows, 0.6s Osmo ease) in the Section / FAQ embed; this script only manages state and ARIA.
 * - The top item opens on load, without animating (transitions switch on via [data-faq-ready] one frame later).
 * - One open at a time is the default. data-faq-close-siblings="false" on the toggle (Section / FAQ prop "One open at a time" off) allows several open.
 */
function initFaq() {
  const items = document.querySelectorAll("[data-faq-item]");
  if (!items.length) return;

  function refreshScroll() {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  function setOpen(toggle, open) {
    toggle.setAttribute("aria-expanded", String(open));
  }

  // Number per list so two FAQ sections on one page each open their own top item
  const lists = new Map();
  items.forEach(function (item) {
    const list = item.parentElement;
    if (!lists.has(list)) lists.set(list, []);
    lists.get(list).push(item);
  });

  let count = 0;

  lists.forEach(function (listItems, list) {
    listItems.forEach(function (item, i) {
      const toggle = item.querySelector("[data-faq-toggle]");
      const answer = item.querySelector("[data-faq-answer]");
      if (!toggle || !answer || toggle.dataset.faqBound) return;
      toggle.dataset.faqBound = "true";

      count += 1;
      if (!toggle.id) toggle.id = "faq-toggle-" + count;
      if (!answer.id) answer.id = "faq-answer-" + count;
      toggle.setAttribute("aria-controls", answer.id);
      answer.setAttribute("aria-labelledby", toggle.id);
      setOpen(toggle, i === 0);

      toggle.addEventListener("click", function () {
        const open = toggle.getAttribute("aria-expanded") !== "true";

        const closeSiblings = (toggle.getAttribute("data-faq-close-siblings") || "").toLowerCase() !== "false";
        if (open && closeSiblings) {
          list.querySelectorAll("[data-faq-toggle]").forEach(function (other) {
            if (other !== toggle) setOpen(other, false);
          });
        }

        setOpen(toggle, open);
      });

      answer.addEventListener("transitionend", function (e) {
        if (e.target === answer && e.propertyName === "grid-template-rows") refreshScroll();
      });
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        listItems.forEach(function (item) {
          item.setAttribute("data-faq-ready", "");
        });
      });
    });
  });
}
