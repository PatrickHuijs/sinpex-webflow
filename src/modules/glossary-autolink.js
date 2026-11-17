/*
 * Glossary auto-links in articles (Resources template, CMS rich text .article_rich-text).
 *
 * Links the first mention of each glossary term in an article to its term page. The term list comes from the glossary
 * overview page in the page's language (/glossary or /de/glossary): every [data-glossary-item] with
 * data-glossary-name, optional data-glossary-aka (abbreviations or synonyms, comma separated) and a link to the term.
 * The list is cached for an hour in sessionStorage, so it's fetched once per visit.
 *
 * Matching: whole words only. Names match regardless of case; abbreviations in capitals (e.g. UBO, KYB) only in
 * capitals. Longer names win over shorter ones (e.g. "UBO register" before "UBO"). One link per term, at most 12 per
 * article. Only text in paragraphs, list items and table cells; never inside existing links, headings, the TOC,
 * FAQ questions, CTA or proof boxes, or anything marked data-no-glossary. Terms shorter than 3 characters are skipped.
 * Links get class glossary-link and look like every other rich text link.
 *
 * Runs on every page change (the rich text is new after a Barba transition). Does nothing until the overview page
 * exists and has items.
 */
const GLOSSARY_MAX_LINKS = 12;
const GLOSSARY_CACHE_MS = 60 * 60 * 1000;
const GLOSSARY_SKIP = "a, h1, h2, h3, h4, h5, h6, summary, button, code, figure, .article-toc, .article-cta, .article-proof, [data-no-glossary]";

function glossaryEscape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function glossaryFetchTerms(prefix) {
  const key = "sx-glossary" + (prefix || "-en");
  try {
    const cached = JSON.parse(sessionStorage.getItem(key) || "null");
    if (cached && Date.now() - cached.at < GLOSSARY_CACHE_MS) return Promise.resolve(cached.terms);
  } catch (e) {}

  return fetch(prefix + "/glossary", { credentials: "same-origin" })
    .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
    .then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const terms = [];
      doc.querySelectorAll("[data-glossary-item]").forEach((item) => {
        const link = item.matches("a[href]") ? item : item.querySelector("a[href]");
        if (!link) return;
        const name = (item.getAttribute("data-glossary-name") || link.textContent).replace(/\s+/g, " ").trim();
        const aka = (item.getAttribute("data-glossary-aka") || "").split(",").map((s) => s.trim()).filter(Boolean);
        const href = new URL(link.getAttribute("href"), window.location.href).pathname;
        if (name) terms.push({ name: name, aka: aka, href: href });
      });
      try {
        sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), terms: terms }));
      } catch (e) {}
      return terms;
    })
    .catch(() => {
      // No overview page yet (or offline): remember that for the hour too, so articles don't refetch it
      try {
        sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), terms: [] }));
      } catch (e) {}
      return [];
    });
}

function glossaryLinkTerms(richText, terms) {
  const here = window.location.pathname.replace(/\/$/, "");
  const patterns = [];
  terms.forEach((term, index) => {
    if (term.href.replace(/\/$/, "") === here) return;
    [term.name].concat(term.aka).forEach((word) => {
      if (word.length < 3) return;
      const caps = /^[A-Z0-9ÄÖÜ&-]+$/.test(word);
      patterns.push({ index: index, word: word, caps: caps });
    });
  });
  if (!patterns.length) return;
  patterns.sort((a, b) => b.word.length - a.word.length);

  const sensitive = patterns.filter((p) => p.caps).map((p) => glossaryEscape(p.word));
  const insensitive = patterns.filter((p) => !p.caps).map((p) => glossaryEscape(p.word));
  const edgeBefore = "(?<![\\p{L}\\p{N}])";
  const edgeAfter = "(?![\\p{L}\\p{N}])";
  const regexes = [];
  if (sensitive.length) regexes.push(new RegExp(edgeBefore + "(" + sensitive.join("|") + ")" + edgeAfter, "gu"));
  if (insensitive.length) regexes.push(new RegExp(edgeBefore + "(" + insensitive.join("|") + ")" + edgeAfter, "giu"));

  function termFor(match) {
    const found = patterns.find((p) => (p.caps ? p.word === match : p.word.toLowerCase() === match.toLowerCase()));
    return found ? found.index : -1;
  }

  const linked = new Set();
  let count = 0;

  richText.querySelectorAll("p, li, td").forEach((block) => {
    if (count >= GLOSSARY_MAX_LINKS || block.closest(GLOSSARY_SKIP)) return;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (node.parentElement.closest(GLOSSARY_SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((start) => {
      let node = start;
      // Link the earliest unlinked term in the text, then carry on with the text after the new link
      while (node && count < GLOSSARY_MAX_LINKS) {
        let best = null;
        regexes.forEach((regex) => {
          regex.lastIndex = 0;
          let m;
          while ((m = regex.exec(node.data))) {
            const index = termFor(m[1]);
            if (index > -1 && !linked.has(index)) {
              if (!best || m.index < best.at) best = { at: m.index, text: m[1], index: index };
              break;
            }
          }
        });
        if (!best) return;

        const match = node.splitText(best.at);
        const rest = match.splitText(best.text.length);
        const link = document.createElement("a");
        link.href = terms[best.index].href;
        link.className = "glossary-link";
        link.textContent = best.text;
        match.parentNode.replaceChild(link, match);
        linked.add(best.index);
        count++;
        node = rest;
      }
    });
  });
}

function initGlossaryAutolink() {
  const richText = document.querySelector(".resource-hero_header") && document.querySelector(".article_rich-text");
  if (!richText || richText.querySelector(".glossary-link")) return;
  const de = (document.documentElement.lang || "").toLowerCase().indexOf("de") === 0;
  glossaryFetchTerms(de ? "/de" : "").then((terms) => {
    if (terms.length && richText.isConnected) glossaryLinkTerms(richText, terms);
  });
}
