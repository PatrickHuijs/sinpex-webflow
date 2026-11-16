/*
 * Article table of contents (Resources template, CMS rich text .article_rich-text).
 *
 * 1. Builds the TOC from the H2s. Every .article-toc in the rich text (side TOC nav.article-toc--side and the
 *    folding TOC details.article-toc--fold) gets its <ol> filled with one link per H2, labelled with the H2 text.
 *    Editors only place the TOC shells (label "In this article" + empty <ol>); any links already in them are replaced.
 *    Anchors: the span.article-anchor directly before an H2 is reused (its id stays the link target);
 *    an H2 without one gets a new span.article-anchor with an id made from its text, inserted right before it.
 *    Long labels are cut to 2 lines in CSS (Section / Article content embed).
 * 2. Highlights the section in view in the side TOC: the link of the last section whose H2 has passed the top third
 *    of the viewport gets .is-active; nothing before the first H2. The folding TOC is not highlighted.
 *
 * Only runs on pages with a .article-toc inside .article_rich-text. Scroll/resize listeners are removed through
 * pageCleanups on a Barba page change. On a direct load with a #hash of a generated anchor, scrolls to it once built.
 */
// Anchor id from the H2 text: lowercase, no accents (ß → ss), hyphens; cut to 50 characters on a whole word
function articleTocSlug(text) {
  let slug = text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length > 50) {
    slug = slug.slice(0, 51);
    slug = slug.indexOf("-") > -1 ? slug.slice(0, slug.lastIndexOf("-")) : slug.slice(0, 50);
  }
  return slug || "section";
}

function buildArticleToc(richText) {
  const sections = [];
  richText.querySelectorAll(":scope > h2").forEach((heading) => {
    const label = heading.textContent.replace(/\s+/g, " ").trim();
    if (!label) return;

    // Reuse the anchor right before the H2 (in its own embed, or as a direct sibling)
    const prev = heading.previousElementSibling;
    let anchor = null;
    if (prev && prev.matches(".article-anchor[id]")) anchor = prev;
    else if (prev && prev.children.length === 1 && prev.firstElementChild.matches(".article-anchor[id]")) anchor = prev.firstElementChild;

    if (!anchor) {
      const base = articleTocSlug(label);
      let id = base;
      let n = 2;
      while (document.getElementById(id)) id = base + "-" + n++;
      anchor = document.createElement("span");
      anchor.className = "article-anchor";
      anchor.id = id;
      anchor.setAttribute("aria-hidden", "true");
      heading.parentNode.insertBefore(anchor, heading);
    }
    sections.push({ id: anchor.id, label, heading });
  });

  richText.querySelectorAll(".article-toc").forEach((toc) => {
    let list = toc.querySelector("ol");
    if (!list) {
      list = document.createElement("ol");
      (toc.querySelector(".article-toc_inner") || toc).appendChild(list);
    }
    list.textContent = "";
    sections.forEach((section) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#" + section.id;
      const text = document.createElement("span");
      text.className = "article-toc_text"; // the 2-line clamp sits on this span, so the link keeps its padding
      text.textContent = section.label;
      link.appendChild(text);
      item.appendChild(link);
      list.appendChild(item);
    });
  });

  return sections;
}

function initArticleToc() {
  const richText = Array.from(document.querySelectorAll(".article_rich-text")).find((el) => el.querySelector(".article-toc"));
  if (!richText) return;

  const hash = decodeURIComponent(window.location.hash.slice(1));
  const hadTarget = hash ? !!document.getElementById(hash) : true;

  const sections = buildArticleToc(richText);
  if (!sections.length) return;

  // Direct load on a #hash that only exists now the anchors are built: jump there
  if (!hadTarget) {
    const target = document.getElementById(hash);
    if (target) {
      requestAnimationFrame(() => {
        if (window.lenis) window.lenis.scrollTo(target, { immediate: true, force: true });
        else target.scrollIntoView();
      });
    }
  }

  // Highlight the section in view in the side TOC
  const side = richText.querySelector(".article-toc--side");
  if (!side) return;
  const items = sections
    .map((section) => ({ link: side.querySelector('a[href="#' + CSS.escape(section.id) + '"]'), heading: section.heading }))
    .filter((item) => item.link);
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
