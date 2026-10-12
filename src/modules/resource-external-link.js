/*
 * Resources: external link override.
 * Markup: any element with [data-external-link], bound in the Designer to the Resources "External link" CMS field.
 *         Put it on the Collection Item of each Resources list (or directly on a link).
 * - When the value is filled, every link inside that element (or the element itself, if it is a link)
 *   goes to that URL in a new tab instead of the resource detail page.
 * - Empty value: nothing changes, the card keeps its detail page link.
 * - Forgiving: the value is trimmed; a URL typed without a protocol gets https:// added.
 * - The filter tabs (resource-library.js) and the webinar slider (webinar-slider.js) show, hide and move the
 *   existing cards but never rebuild them, so running once per page init is enough.
 * No CSS.
 */
function initResourceExternalLinks() {
  const sources = document.querySelectorAll("[data-external-link]");
  if (!sources.length) return;

  function normalise(value) {
    const url = (value || "").trim();
    if (!url || url === "#") return "";
    if (/^(https?:)?\/\//i.test(url) || url.startsWith("/") || /^(mailto|tel):/i.test(url)) return url;
    return "https://" + url;
  }

  sources.forEach((source) => {
    if (source.dataset.externalLinkReady) return;

    const url = normalise(source.getAttribute("data-external-link"));
    if (!url) return;
    source.dataset.externalLinkReady = "true";

    const links = source.matches("a") ? [source] : Array.from(source.querySelectorAll("a[href]"));
    links.forEach((link) => {
      link.setAttribute("href", url);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  });
}
