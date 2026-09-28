/*
 * Section / Capabilities: collapsible capability groups in the plan comparison table.
 * Markup: [data-capability-group] > button[data-capability-toggle] + [data-capability-rows]
 * Groups start open (aria-expanded="true" in Webflow). CSS lives in the Section / Capabilities embed.
 */
function initCapabilityTable() {
  const groups = document.querySelectorAll("[data-capability-group]");
  if (!groups.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function refreshScroll() {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  groups.forEach(function (group, i) {
    const toggle = group.querySelector("[data-capability-toggle]");
    const rows = group.querySelector("[data-capability-rows]");
    if (!toggle || !rows || toggle.dataset.capabilityBound) return;
    toggle.dataset.capabilityBound = "true";

    if (!rows.id) rows.id = "capability-rows-" + (i + 1);
    toggle.setAttribute("aria-controls", rows.id);

    let open = toggle.getAttribute("aria-expanded") !== "false";
    rows.hidden = !open;

    toggle.addEventListener("click", function () {
      open = !open;
      toggle.setAttribute("aria-expanded", String(open));
      gsap.killTweensOf(rows);

      if (reduceMotion) {
        rows.hidden = !open;
        gsap.set(rows, { clearProps: "height" });
        refreshScroll();
        return;
      }

      if (open) {
        rows.hidden = false;
        gsap.fromTo(rows, { height: 0 }, {
          height: "auto",
          duration: 0.4,
          ease: "power2.out",
          clearProps: "height",
          onComplete: refreshScroll
        });
      } else {
        gsap.to(rows, {
          height: 0,
          duration: 0.35,
          ease: "power2.inOut",
          onComplete: function () {
            rows.hidden = true;
            gsap.set(rows, { clearProps: "height" });
            refreshScroll();
          }
        });
      }
    });
  });
}
