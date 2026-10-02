/*
 * Resources template: picks one of the three heroes for the current item. Runs first, before the scroll modules measure.
 * Markup: [data-resource-hero="default" | "webinar-upcoming" | "webinar-past"] on each hero section.
 *         Inside each: [data-resource-type] (Type text) and [data-resource-date] (Date text, e.g. "August 5, 2026").
 * - Type is not webinar: "default".
 * - Type is webinar, date is today or later (calendar day, no times): "webinar-upcoming" (hero with the sign-up form).
 * - Type is webinar, date is before today: "webinar-past" (no form, button to the recording).
 * - Webinar without a readable date counts as upcoming. A missing hero falls back to "default", then to the first one.
 * The chosen hero gets data-resource-hero-active; the others are removed, so the page keeps one h1 and one form.
 * CSS (hides heroes until one is active) lives in the Section / Webinar hero form embed.
 */
function initResourceHero() {
  const heroes = Array.from(document.querySelectorAll("[data-resource-hero]"));
  if (!heroes.length) return;
  if (heroes.some((hero) => hero.hasAttribute("data-resource-hero-active"))) return;

  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  // Returns a local Date at midnight, or null when the text can't be read
  function parseDay(text) {
    const t = (text || "").trim().toLowerCase();
    if (!t) return null;
    let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const monthIndex = MONTHS.findIndex((name) => new RegExp("\\b" + name).test(t));
    const year = t.match(/\b(\d{4})\b/);
    if (monthIndex > -1 && year) {
      const day = t.replace(year[0], "").match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (day) return new Date(+year[1], monthIndex, +day[1]);
    }
    m = t.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
    if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
    const parsed = new Date(t);
    return isNaN(parsed) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  function textOf(selector) {
    for (const hero of heroes) {
      const el = hero.querySelector(selector);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return "";
  }

  const keyOf = (hero) => (hero.getAttribute("data-resource-hero") || "").trim().toLowerCase();
  const find = (key) => heroes.find((hero) => keyOf(hero) === key);

  let wanted = "default";
  if (textOf("[data-resource-type]").toLowerCase().includes("webinar")) {
    const day = parseDay(textOf("[data-resource-date]"));
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    wanted = day && day.getTime() < today.getTime() ? "webinar-past" : "webinar-upcoming";
  }

  const active = find(wanted) || find("default") || heroes[0];
  active.setAttribute("data-resource-hero-active", "");
  heroes.forEach((hero) => { if (hero !== active) hero.remove(); });
}
