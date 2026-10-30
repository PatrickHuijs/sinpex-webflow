/*
 * Resources: German type labels and dates.
 * The Type option field and the Date field can't be localized in Webflow, so on German pages they show in English.
 * Markup: [data-resource-type] (bound to Type) and [data-resource-date] (bound to Date) on every resource card, the
 *         featured resource, the resource hero and related resources.
 * - German = <html lang> starts with "de". Language changes are full page loads (core/barba.js).
 * - Type: Article, Webinar, Success Story, Event → Artikel, Webinar, Success Story, Event (unknown values stay as they are).
 * - Date: "November 10, 2026" (or "2026-11-10") → "10. November 2026". Anything it can't read stays as it is.
 * - The English value is kept in the attribute (data-resource-type="Article", data-resource-date="November 10, 2026"),
 *   so the filter tabs (resource-library.js) and the webinar status (webinar-slider.js) keep working on German pages.
 * - Runs once per element, so a second init after a Barba swap changes nothing.
 * No CSS.
 */
function initResourceMetaDe() {
  const lang = (document.documentElement.getAttribute("lang") || "").trim().toLowerCase();
  if (lang.indexOf("de") !== 0) return;

  const TYPES = {
    "article": "Artikel",
    "webinar": "Webinar",
    "success story": "Success Story",
    "event": "Event"
  };
  const MONTHS_EN = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const MONTHS_DE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  function germanDate(text) {
    const t = (text || "").trim();
    let m = t.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m) {
      const month = MONTHS_EN.indexOf(m[1].toLowerCase());
      if (month > -1) return m[2] + ". " + MONTHS_DE[month] + " " + m[3];
    }
    m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m && +m[2] >= 1 && +m[2] <= 12) return +m[3] + ". " + MONTHS_DE[+m[2] - 1] + " " + m[1];
    return "";
  }

  document.querySelectorAll("[data-resource-type]").forEach((el) => {
    if (el.dataset.resourceMetaDe) return;
    el.dataset.resourceMetaDe = "true";
    const original = el.textContent.trim();
    const label = TYPES[original.toLowerCase()];
    if (!label) return;
    if (!el.getAttribute("data-resource-type")) el.setAttribute("data-resource-type", original);
    el.textContent = label;
  });

  document.querySelectorAll("[data-resource-date]").forEach((el) => {
    if (el.dataset.resourceMetaDe) return;
    el.dataset.resourceMetaDe = "true";
    const original = el.textContent.trim();
    const date = germanDate(original);
    if (!date) return;
    if (!el.getAttribute("data-resource-date")) el.setAttribute("data-resource-date", original);
    el.textContent = date;
  });
}
