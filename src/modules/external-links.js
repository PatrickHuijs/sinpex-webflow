/*
 * External links: open in a new tab.
 * - Every link to another site (http/https, a different host than the current page, "www." ignored) gets
 *   target="_blank" and rel="noopener noreferrer". This covers CMS-driven links like Careers in the footer
 *   Explore list (Navigations collection), where Webflow has no per-item "open in new tab" option.
 * - Links that already have a target are left alone. mailto:, tel:, #anchors and relative links are skipped.
 * - Opt out: data-new-tab="false" on the link or a parent (case-insensitive) keeps it in the same tab.
 * - Runs on every page init. Barba ignores links to other sites, so this never interferes with transitions.
 * No CSS.
 */
function initExternalLinks() {
  const ownHost = window.location.hostname.replace(/^www\./i, "").toLowerCase();

  document.querySelectorAll("a[href]").forEach((link) => {
    if (link.hasAttribute("target")) return;

    const optOut = link.closest("[data-new-tab]");
    if (optOut && (optOut.getAttribute("data-new-tab") || "").trim().toLowerCase() === "false") return;

    const href = (link.getAttribute("href") || "").trim();
    if (!/^(https?:)?\/\//i.test(href)) return;

    let host;
    try {
      host = new URL(href, window.location.href).hostname.replace(/^www\./i, "").toLowerCase();
    } catch (e) {
      return;
    }
    if (!host || host === ownHost) return;

    link.setAttribute("target", "_blank");
    const rel = (link.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
    ["noopener", "noreferrer"].forEach((value) => {
      if (rel.indexOf(value) === -1) rel.push(value);
    });
    link.setAttribute("rel", rel.join(" "));
  });
}
