/*
 * Glossary structured data (Glossary terms template and the glossary overview page).
 *
 * Term page (an element with data-glossary-term, normally the template's main section):
 *   - gives the DefinedTerm from the template's page settings (head) an @id and url (the canonical URL), so the
 *     other nodes can point at it;
 *   - adds a WebPage: name, url, inLanguage, isPartOf the glossary set, about + mainEntity the term,
 *     publisher Sinpex (#organization), and, when filled, reviewedBy (Person) and lastReviewed;
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
  const setUrl = glossaryUrl(loc.prefix + "/glossary");
  const set = { "@type": "DefinedTermSet", "@id": setUrl + "#glossary", name: loc.setName, url: setUrl };

  // The template's own DefinedTerm (head): add @id, url and the set in the current language
  let termName = "";
  Array.from(document.querySelectorAll('script[type="application/ld+json"]')).forEach((script) => {
    if (!/"DefinedTerm"/.test(script.textContent) || script.hasAttribute("data-glossary-schema")) return;
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch (e) {
      return;
    }
    if (data["@type"] !== "DefinedTerm") return;
    data["@id"] = termId;
    data.url = url;
    data.inDefinedTermSet = set;
    if (!data.alternateName) delete data.alternateName;
    termName = data.name || "";
    script.textContent = JSON.stringify(data);
  });
  if (!termName) {
    const h1 = document.querySelector("h1");
    termName = h1 ? h1.textContent.replace(/\s+/g, " ").trim() : document.title;
  }

  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url + "#webpage",
    name: document.title,
    url: url,
    inLanguage: loc.lang,
    isPartOf: set,
    about: { "@id": termId },
    mainEntity: { "@id": termId },
    publisher: GLOSSARY_ORG,
  };

  const reviewerName = glossaryAttr(el, "data-glossary-reviewer-name");
  if (reviewerName) {
    const person = { "@type": "Person", name: reviewerName, worksFor: GLOSSARY_ORG };
    const role = glossaryAttr(el, "data-glossary-reviewer-role");
    const image = glossaryAttr(el, "data-glossary-reviewer-image");
    const linkedin = glossaryAttr(el, "data-glossary-reviewer-linkedin");
    if (role) person.jobTitle = role;
    if (/^https?:\/\//.test(image)) person.image = image;
    if (/^https?:\/\//.test(linkedin)) {
      person.url = linkedin;
      person.sameAs = [linkedin];
    }
    page.reviewedBy = person;
  }
  const reviewed = glossaryIsoDate(glossaryAttr(el, "data-glossary-last-reviewed"));
  if (reviewed) page.lastReviewed = reviewed;

  glossaryAddSchema(page);
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
