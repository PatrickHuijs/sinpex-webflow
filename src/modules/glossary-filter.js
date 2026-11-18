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
 *   [data-glossary-count]                 shows the number of visible terms
 *
 * Terms are sorted A to Z in the page's language (the CMS list sort can't be relied on). Category buttons without
 * terms are hidden. The active button gets .is-active and aria-pressed="true". Listeners are removed through
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

  const buttons = Array.from(root.querySelectorAll("[data-glossary-filter]"));
  const search = root.querySelector("[data-glossary-search]");
  const countEl = root.querySelector("[data-glossary-count]");
  let activeCategory = "all";

  // Hide categories that have no terms (yet)
  buttons.forEach((button) => {
    const value = glossaryFold(button.getAttribute("data-glossary-filter"));
    if (value && value !== "all" && !items.some((item) => item.category === value)) button.style.display = "none";
  });

  function apply() {
    const query = search ? glossaryFold(search.value) : "";
    let visible = 0;
    items.forEach((item) => {
      const show = (activeCategory === "all" || item.category === activeCategory) && (!query || item.haystack.indexOf(query) > -1);
      item.el.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (countEl) countEl.textContent = String(visible);
  }

  function onFilter(event) {
    const button = event.currentTarget;
    activeCategory = glossaryFold(button.getAttribute("data-glossary-filter")) || "all";
    buttons.forEach((b) => {
      const on = b === button;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    apply();
  }

  buttons.forEach((button) => button.addEventListener("click", onFilter));
  if (search) search.addEventListener("input", apply);
  apply();

  pageCleanups.push(() => {
    buttons.forEach((button) => button.removeEventListener("click", onFilter));
    if (search) search.removeEventListener("input", apply);
  });
}
