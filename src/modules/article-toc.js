/*
 * Article table of contents: highlights the section in view.
 * Markup (CMS rich text, Resources template):
 *   nav.article-toc--side ol li a[href="#id"]   side TOC (desktop)
 *   span.article-anchor#id                       in its own embed, directly before each H2
 * The side TOC link of the last section whose H2 has passed the top third of the viewport gets .is-active.
 * Before the first H2 nothing is active. The folding TOC (details.article-toc--fold) is left alone.
 * Reads positions on scroll (native and Lenis scrollTo both fire window scroll) and resize, once per frame.
 * Only runs on pages with .article-toc--side. Listeners are removed through pageCleanups on a Barba page change.
 * CSS: .article_rich-text .article-toc--side a.is-active (Section / Article content embed).
 */
function initArticleToc() {
  const toc = document.querySelector(".article-toc--side");
  if (!toc) return;

  // Pair each TOC link with the H2 that follows its anchor (falls back to the anchor itself)
  const items = [];
  toc.querySelectorAll('a[href^="#"]').forEach((link) => {
    const id = decodeURIComponent(link.getAttribute("href").slice(1));
    const anchor = id ? document.getElementById(id) : null;
    if (!anchor) return;
    const holder = anchor.parentElement;
    const next = holder && holder.nextElementSibling;
    const heading = next && next.tagName === "H2" ? next : anchor;
    items.push({ link, heading });
  });
  if (!items.length) return;

  let current = null;
  let frame = null;

  function update() {
    frame = null;
    const line = window.innerHeight / 3;
    let active = null;
    items.forEach((item) => {
      if (item.heading.getBoundingClientRect().top <= line) active = item;
    });
    if (active === current) return;
    if (current) current.link.classList.remove("is-active");
    if (active) active.link.classList.add("is-active");
    current = active;
  }

  function onScroll() {
    if (frame === null) frame = requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();

  pageCleanups.push(() => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (frame !== null) cancelAnimationFrame(frame);
    if (current) current.link.classList.remove("is-active");
  });
}
