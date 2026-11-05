/*
 * Spotlight card: screen reader setup for the card link (Section / Spotlight, Section / Featured resource).
 * The card's button link covers the text column (CSS: Global Custom Code > SPOTLIGHT CARD), so there is one link per card
 * and an optional video keeps its own controls (modules/spotlight-video.js).
 * - The link gets a name that stands on its own: "Read story: <card heading>". The visible label comes first, so
 *   voice control still matches it. Runs after resource-cta-labels.js, so German pages use the German label.
 * - The visible button text is hidden from screen readers, otherwise it is read a second time after the link.
 * No CSS.
 */
function initSpotlightCardLinks() {
  document.querySelectorAll(".spotlight-card").forEach((card) => {
    const link = card.querySelector(".clickable_link[href]");
    const heading = card.querySelector("h1, h2, h3");
    if (!link) return;

    const label = (link.textContent || "").trim();
    const title = heading ? (heading.textContent || "").replace(/\s+/g, " ").trim() : "";
    if (label && title) link.setAttribute("aria-label", label + ": " + title);

    const visual = card.querySelector(".button-020__inner");
    if (visual) visual.setAttribute("aria-hidden", "true");
  });
}
