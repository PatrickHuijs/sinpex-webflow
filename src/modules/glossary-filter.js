/*
 * Glossary overview: category filter, search, A to Z order and term count.
 *
 * Hooks (all inside [data-glossary-page]):
 *   [data-glossary-list]                  the term collection list
 *   [data-glossary-item]                  one term; reads data-glossary-name, data-glossary-aka,
 *                                         data-glossary-description and data-glossary-category
 *   [data-glossary-filter]                category buttons; value "all" or the category name (matched case-insensitively)
 *   [data-glossary-search]                search input; matches name, abbreviations/synonyms and short definition,
 *                                         ignoring case and accents
 *   [data-glossary-count]                 shows the number of matching terms
 *   [data-glossary-search-clear]          button that empties the search (shown by CSS while the input has text)
 *   [data-glossary-more]                  wrapper of the Load more button; shows 20 more terms per click
 *   [data-glossary-item] a.glossary_item-link  full-item link; its href is set from data-glossary-slug
 *
 * On /de the search placeholder and the aria-labels are set in German (attributes can't be localized in Webflow).
 * Terms are sorted A to Z in the page's language and category buttons by data-glossary-order (the CMS list sort
 * can't be relied on). Category buttons without
 * terms are hidden. The active button gets .is-active and aria-pressed="true". Typing a search resets the category
 * to All, so every term is searched. Only the first 20 matches show until Load more is clicked. Listeners are removed through
 * pageCleanups on a Barba page change.
 */
function glossaryFold(text) {
  return (text || "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const GLOSSARY_PAGE_SIZE = 20;

function initGlossaryFilter() {
  const root = document.querySelector("[data-glossary-page]");
  if (!root) return;
  const list = root.querySelector("[data-glossary-list]");
  if (!list) return;

  const lang = (document.documentElement.lang || "en").slice(0, 2);
  const items = Array.from(list.querySelectorAll("[data-glossary-item]")).map((el) => ({
    el: el,
    name: (el.getAttribute("data-glossary-name") || el.textContent).trim(),
    category: glossaryFold(el.getAttribute("data-glossary-category")),
    haystack: glossaryFold(
      [el.getAttribute("data-glossary-name"), el.getAttribute("data-glossary-aka"), el.getAttribute("data-glossary-description")].join(" ")
    ),
  }));

  // A to Z in the page language; the items keep their own Webflow wrappers, only their order changes
  items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, lang, { sensitivity: "base" }))
    .forEach((item) => list.appendChild(item.el));

  // Full-item link: point it at the term page (the Designer can't bind a link to the current item here)
  const prefix = /^\/de(\/|$)/.test(location.pathname) ? "/de" : "";
  items.forEach((item) => {
    const slug = item.el.getAttribute("data-glossary-slug");
    const link = item.el.querySelector(".glossary_item-link");
    if (!link || !slug) return;
    link.setAttribute("href", prefix + "/glossary/" + slug);
    link.setAttribute("aria-label", item.name);
  });

  const buttons = Array.from(root.querySelectorAll("[data-glossary-filter]"));
  const search = root.querySelector("[data-glossary-search]");
  const clear = root.querySelector("[data-glossary-search-clear]");
  const more = root.querySelector("[data-glossary-more]");
  let limit = GLOSSARY_PAGE_SIZE;

  // Attribute texts can't be localized in Webflow: set the German ones here
  if (lang === "de") {
    if (search) {
      search.setAttribute("placeholder", "Suchen");
      search.setAttribute("aria-label", "Begriffe durchsuchen");
    }
    if (clear) clear.setAttribute("aria-label", "Suche löschen");
    const group = root.querySelector("[data-glossary-filters]");
    if (group) group.setAttribute("aria-label", "Begriffe nach Kategorie filtern");
  }
  const countEl = root.querySelector("[data-glossary-count]");
  let activeCategory = "all";

  // Category buttons in the Order field's order (data-glossary-order); the CMS list sort can't be relied on
  const ordered = buttons.filter((b) => b.hasAttribute("data-glossary-order"));
  ordered
    .slice()
    .sort((a, b) => (parseFloat(a.getAttribute("data-glossary-order")) || 0) - (parseFloat(b.getAttribute("data-glossary-order")) || 0))
    .forEach((button) => {
      const row = button.closest(".w-dyn-item") || button;
      if (row.parentNode) row.parentNode.appendChild(row);
    });

  // Hide categories that have no terms (yet)
  buttons.forEach((button) => {
    const value = glossaryFold(button.getAttribute("data-glossary-filter"));
    if (value && value !== "all" && !items.some((item) => item.category === value)) button.style.display = "none";
  });

  function apply() {
    const query = search ? glossaryFold(search.value) : "";
    let matches = 0;
    items.forEach((item) => {
      const match = (activeCategory === "all" || item.category === activeCategory) && (!query || item.haystack.indexOf(query) > -1);
      if (match) matches++;
      item.el.style.display = match && matches <= limit ? "" : "none";
    });
    if (countEl) countEl.textContent = String(matches);
    if (more) more.style.display = matches > limit ? "" : "none";
  }

  function setCategory(value) {
    activeCategory = value || "all";
    buttons.forEach((b) => {
      const on = (glossaryFold(b.getAttribute("data-glossary-filter")) || "all") === activeCategory;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function onFilter(event) {
    setCategory(glossaryFold(event.currentTarget.getAttribute("data-glossary-filter")));
    limit = GLOSSARY_PAGE_SIZE;
    apply();
  }

  // Searching always covers every category
  function onSearch() {
    if (search.value.trim() && activeCategory !== "all") setCategory("all");
    limit = GLOSSARY_PAGE_SIZE;
    apply();
  }

  function onClear() {
    search.value = "";
    onSearch();
    search.focus();
  }

  function onMore(event) {
    if (!event.target.closest("a, button")) return;
    event.preventDefault();
    limit += GLOSSARY_PAGE_SIZE;
    apply();
  }

  buttons.forEach((button) => button.addEventListener("click", onFilter));
  if (search) search.addEventListener("input", onSearch);
  if (search && clear) clear.addEventListener("click", onClear);
  if (more) more.addEventListener("click", onMore);
  apply();

  pageCleanups.push(() => {
    buttons.forEach((button) => button.removeEventListener("click", onFilter));
    if (search) search.removeEventListener("input", onSearch);
    if (search && clear) clear.removeEventListener("click", onClear);
    if (more) more.removeEventListener("click", onMore);
  });
}
