/*
 * Resources: German CTA labels.
 * The CTA text on resource cards comes from a conditional binding per resource type, which Webflow
 * localization cannot translate. On German pages this swaps the English labels for German ones.
 * Scope: only inside resource cards (Card / Resource, .resource-card) and the featured resource
 *        card (Section / Featured resource, .spotlight-card), wherever those cards appear on the site.
 * Targets: the visible label layers (.button_text in Button Main, .button_link_text in Button Text Link)
 *          and the hidden link text (.clickable_text).
 * - German = <html lang> starts with "de". Language changes are full page loads (core/barba.js),
 *   so the lang attribute always matches the current page.
 * - Only exact labels in LABELS change (trimmed, case-insensitive); anything else is left alone.
 * - The filter tabs (resource-library.js) and the webinar slider (webinar-slider.js) read
 *   [data-resource-type] and [data-resource-date], never the CTA text, so the swap does not affect them.
 * No CSS.
 */
function initResourceCtaLabels() {
  const lang = (document.documentElement.getAttribute("lang") || "").trim().toLowerCase();
  if (lang.indexOf("de") !== 0) return;

  const LABELS = {
    "read article": "Artikel lesen",
    "watch webinar": "Webinar ansehen",
    "read story": "Story lesen"
  };

  const cards = document.querySelectorAll(".resource-card, .spotlight-card");
  if (!cards.length) return;

  cards.forEach((card) => {
    card.querySelectorAll(".button_text, .button_link_text, .clickable_text").forEach((el) => {
      const key = (el.textContent || "").trim().toLowerCase();
      if (LABELS[key]) el.textContent = LABELS[key];
    });
  });
}
