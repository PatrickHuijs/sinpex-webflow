/*
 * Glossary structured data (Glossary terms template and the glossary overview page).
 *
 * Term page (an element with data-glossary-term, normally the template's main section):
 *   - completes the schema from the template's page settings (JSON-LD field: a DefinedTerm, or an @graph with
 *     DefinedTerm and WebPage): @id and url (the canonical URL) on the term, the glossary set in the page language,
 *     and on the WebPage url, inLanguage, isPartOf, about + mainEntity; empty values (alternateName, reviewer,
 *     date) are dropped and the date becomes YYYY-MM-DD;
 *   - adds a WebPage when the page settings schema has none, with publisher Sinpex and, when filled, the reviewer;
 *   - adds a BreadcrumbList: Home > Glossary > term.
 *   Attributes on the data-glossary-term element (bound to CMS fields in Webflow; empty ones are skipped):
 *     data-glossary-reviewer-name, data-glossary-reviewer-role, data-glossary-reviewer-image,
 *     data-glossary-reviewer-linkedin, data-glossary-last-reviewed (date, best as YYYY-MM-DD).
 *
 * Overview page (an element with data-glossary-list containing [data-glossary-item] items):
 *   - adds a DefinedTermSet with every term as hasDefinedTerm (name, url, description, alternateName);
 *   - adds a BreadcrumbList: Home > Glossary.
 *   Per item: data-glossary-name, data-glossary-description, data-glossary-aka (optional) and data-glossary-slug
 *   (the term URL is /glossary/{slug}, or /de/glossary/{slug}); without a slug the item's first <a href> is used.
 *
 * EN or DE comes from <html lang>. Runs on the first page load only: Barba does not swap the <head>, and crawlers
 * always load a page directly. No CSS.
 */
const GLOSSARY_ORIGIN = "https://www.sinpex.ai";
const GLOSSARY_ORG = { "@type": "Organization", "@id": "https://www.sinpex.ai/#organization", name: "Sinpex", url: "https://www.sinpex.ai" };
let glossarySchemaDone = false;

function glossaryLocale() {
  const de = (document.documentElement.lang || "").toLowerCase().indexOf("de") === 0;
  return {
    de: de,
    lang: de ? "de" : "en",
    prefix: de ? "/de" : "",
    glossaryLabel: de ? "Glossar" : "Glossary",
    setName: de ? "Sinpex Glossar" : "Sinpex Glossary",
    homeLabel: de ? "Startseite" : "Home",
  };
}

// Absolute URL on the production domain, whatever host the page runs on (staging included)
function glossaryUrl(path) {
  const clean = (path || "/").replace(/[?#].*$/, "");
  return GLOSSARY_ORIGIN + (clean.charAt(0) === "/" ? clean : "/" + clean);
}

function glossaryPagePath() {
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical && canonical.href) {
    try {
      return new URL(canonical.href).pathname;
    } catch (e) {}
  }
  return window.location.pathname;
}

function glossaryAddSchema(data) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.setAttribute("data-glossary-schema", "");
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

function glossaryAttr(el, name) {
  const value = (el.getAttribute(name) || "").trim();
  return value;
}

function glossaryIsoDate(value) {
  if (!value) return "";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const time = Date.parse(value);
  if (isNaN(time)) return "";
  const d = new Date(time);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function glossaryBreadcrumb(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}

function glossaryTermSchema(el, loc) {
  const url = glossaryUrl(glossaryPagePath());
  const termId = url + "#term";
  const pageId = url + "#webpage";
  const setUrl = glossaryUrl(loc.prefix + "/glossary");
  const set = { "@type": "DefinedTermSet", "@id": setUrl + "#glossary", name: loc.setName, url: setUrl };

  // Reviewer and date from the data attributes (fallback when the page settings schema has none)
  const reviewerName = glossaryAttr(el, "data-glossary-reviewer-name");
  let reviewer = null;
  if (reviewerName) {
    reviewer = { "@type": "Person", name: reviewerName, worksFor: { "@id": GLOSSARY_ORG["@id"] } };
    const role = glossaryAttr(el, "data-glossary-reviewer-role");
    const image = glossaryAttr(el, "data-glossary-reviewer-image");
    const linkedin = glossaryAttr(el, "data-glossary-reviewer-linkedin");
    if (role) reviewer.jobTitle = role;
    if (/^https?:\/\//.test(image)) reviewer.image = image;
    if (/^https?:\/\//.test(linkedin)) {
      reviewer.url = linkedin;
      reviewer.sameAs = [linkedin];
    }
  }
  const reviewedAttr = glossaryIsoDate(glossaryAttr(el, "data-glossary-last-reviewed"));

  // Completes the term node: @id, url, the set in the current language, no empty alternateName
  function fixTerm(term) {
    term["@id"] = termId;
    term.url = url;
    term.inDefinedTermSet = set;
    if (!term.alternateName) delete term.alternateName;
  }

  // Completes the page node: ids and links, ISO date, reviewer only when it has a name
  function fixPage(page) {
    page["@id"] = pageId;
    page.url = url;
    if (!page.name) page.name = document.title;
    page.inLanguage = loc.lang;
    page.isPartOf = set;
    page.about = { "@id": termId };
    page.mainEntity = { "@id": termId };
    if (!page.publisher) page.publisher = GLOSSARY_ORG;
    const reviewed = glossaryIsoDate(page.lastReviewed) || reviewedAttr;
    if (reviewed) page.lastReviewed = reviewed;
    else delete page.lastReviewed;
    if (page.reviewedBy && !page.reviewedBy.name) delete page.reviewedBy;
    if (page.reviewedBy && !page.reviewedBy.jobTitle) delete page.reviewedBy.jobTitle;
    if (!page.reviewedBy && reviewer) page.reviewedBy = reviewer;
  }

  // The template's own schema (page settings): a DefinedTerm on its own, or an @graph with DefinedTerm and WebPage
  let termName = "";
  let hasPage = false;
  Array.from(document.querySelectorAll('script[type="application/ld+json"]')).forEach((script) => {
    if (script.hasAttribute("data-glossary-schema") || !/"DefinedTerm"/.test(script.textContent)) return;
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) {
      return;
    }
    const nodes = Array.isArray(data["@graph"]) ? data["@graph"] : [data];
    nodes.forEach((node) => {
      if (node["@type"] === "DefinedTerm") {
        fixTerm(node);
        termName = node.name || termName;
      } else if (node["@type"] === "WebPage") {
        fixPage(node);
        hasPage = true;
      }
    });
    script.textContent = JSON.stringify(data);
  });
  if (!termName) {
    const h1 = document.querySelector("h1");
    termName = h1 ? h1.textContent.replace(/\s+/g, " ").trim() : document.title;
  }

  if (!hasPage) {
    const page = { "@context": "https://schema.org", "@type": "WebPage" };
    fixPage(page);
    glossaryAddSchema(page);
  }
  glossaryAddSchema(
    glossaryBreadcrumb([
      { name: loc.homeLabel, url: glossaryUrl(loc.prefix + "/") },
      { name: loc.glossaryLabel, url: setUrl },
      { name: termName, url: url },
    ])
  );
}

function glossaryOverviewSchema(list, loc) {
  const url = glossaryUrl(glossaryPagePath());
  const terms = [];
  list.querySelectorAll("[data-glossary-item]").forEach((item) => {
    const link = item.matches("a[href]") ? item : item.querySelector("a[href]");
    const name = glossaryAttr(item, "data-glossary-name") || (link ? link.textContent.replace(/\s+/g, " ").trim() : "");
    const slug = glossaryAttr(item, "data-glossary-slug");
    if (!name || (!slug && !link)) return;
    const termUrl = glossaryUrl(slug ? loc.prefix + "/glossary/" + slug : new URL(link.getAttribute("href"), window.location.href).pathname);
    const term = { "@type": "DefinedTerm", "@id": termUrl + "#term", name: name, url: termUrl };
    const description = glossaryAttr(item, "data-glossary-description");
    const aka = glossaryAttr(item, "data-glossary-aka");
    if (description) term.description = description;
    if (aka) term.alternateName = aka;
    terms.push(term);
  });
  if (!terms.length) return;

  glossaryAddSchema({
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    "@id": url + "#glossary",
    name: loc.setName,
    url: url,
    inLanguage: loc.lang,
    publisher: GLOSSARY_ORG,
    hasDefinedTerm: terms,
  });
  glossaryAddSchema(
    glossaryBreadcrumb([
      { name: loc.homeLabel, url: glossaryUrl(loc.prefix + "/") },
      { name: loc.glossaryLabel, url: url },
    ])
  );
}

function initGlossarySchema() {
  if (glossarySchemaDone) return;
  glossarySchemaDone = true;

  const loc = glossaryLocale();
  const term = document.querySelector("[data-glossary-term]");
  if (term) glossaryTermSchema(term, loc);
  const list = document.querySelector("[data-glossary-list]");
  if (list) glossaryOverviewSchema(list, loc);
}
