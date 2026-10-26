/*
 * Resources: German CTA labels.
 * Resource CTAs get their text from a conditional binding per resource type, which Webflow
 * localization cannot translate. On German pages this swaps the English labels for German ones.
 * Scope: site-wide, but only the button label layers: .button_text (Button Main),
 *        .button_link_text (Button Text Link) and the hidden link text .clickable_text (Clickable).
 *        Covers resource cards, the webinar spotlight, the featured resource and the resource detail page.
 * - German = <html lang> starts with "de". Language changes are full page loads (core/barba.js),
 *   so the lang attribute always matches the current page.
 * - Only exact labels in LABELS change (trimmed, case-insensitive). Text Webflow already localizes
 *   natively is German on /de/ and never matches, so anything else is left alone.
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

  document.querySelectorAll(".button_text, .button_link_text, .clickable_text").forEach((el) => {
    const key = (el.textContent || "").trim().toLowerCase();
    if (LABELS[key]) el.textContent = LABELS[key];
  });
}
