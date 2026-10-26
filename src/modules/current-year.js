/*
 * Current year: keeps the copyright year up to date.
 * Markup: [data-current-year] on the text block that holds the year (Footer: "© Sinpex 2026").
 * - Replaces the last four-digit year (19xx/20xx) in the element's text with the visitor's current year,
 *   so the rest of the text (and its German version) stays as typed in Webflow.
 * - No year in the text: the year is appended after a space.
 * - The footer sits outside the Barba container, so this effectively runs once; re-running after a
 *   transition is harmless.
 * No CSS.
 */
function initCurrentYear() {
  const els = document.querySelectorAll("[data-current-year]");
  if (!els.length) return;

  const year = String(new Date().getFullYear());

  els.forEach((el) => {
    const text = el.textContent || "";
    const matches = text.match(/\b(19|20)\d{2}\b/g);
    if (matches) {
      const last = matches[matches.length - 1];
      if (last === year) return;
      const i = text.lastIndexOf(last);
      el.textContent = text.slice(0, i) + year + text.slice(i + last.length);
    } else {
      el.textContent = text.trim() ? text.trim() + " " + year : year;
    }
  });
}
