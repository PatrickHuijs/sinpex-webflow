/*
 * Section / Related resources (Keep reading): never shows the resource you are on.
 * A Collection List inside a component has no page context, so Webflow's "exclude current item" filter is not available.
 * Markup: [data-related-resources] around the Collection List, whose limit is one higher than the number to show (4 for 3).
 * - Removes the item that links to the current page, then keeps the first 3 ([data-related-resources] value overrides 3).
 * - Compares paths, so it works on /de/ too. Runs before resource-external-link.js, which rewrites the card links.
 * No CSS.
 */
function initRelatedResources() {
  const clean = (path) => path.replace(/\/+$/, "") || "/";

  document.querySelectorAll("[data-related-resources]").forEach((wrapper) => {
    const max = parseInt(wrapper.getAttribute("data-related-resources"), 10) || 3;
    const here = clean(window.location.pathname);

    wrapper.querySelectorAll(".w-dyn-item").forEach((item) => {
      const link = item.querySelector("a[href]");
      if (link && clean(link.pathname) === here) item.remove();
    });

    Array.from(wrapper.querySelectorAll(".w-dyn-item")).slice(max).forEach((item) => item.remove());
  });
}
