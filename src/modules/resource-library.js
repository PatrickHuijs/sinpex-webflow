/*
 * Section / Resources: type filter tabs + client-side pagination for the Resources collection list.
 * Markup: [data-resources="wrapper"]
 *           [data-resources-filter="all" | "<Type option name>"] (buttons; "Case Study", "Article", "Webinar", "Event")
 *           [data-resources="list"][data-resources-per-page="4"] > [data-resources="item"] (each holds a Card / Resource)
 *           [data-resources="pagination"] (page buttons are built here), [data-resources="status"] (screen reader count)
 * - An item's type is read from the card's [data-resource-type] text, which is bound to the Type option field.
 * - Filtering resets to page 1. Paging scrolls back to the top of the library (instant with reduced motion).
 * - Pagination shows every page up to 5 pages, otherwise first, last and the pages around the current one with gaps.
 * CSS lives in the Section / Resources embed.
 */
function initResourceLibrary() {
  const wrappers = document.querySelectorAll('[data-resources="wrapper"]');
  if (!wrappers.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  wrappers.forEach((wrapper) => {
    if (wrapper.dataset.resourcesReady) return;

    const list = wrapper.querySelector('[data-resources="list"]');
    const items = Array.from(wrapper.querySelectorAll('[data-resources="item"]'));
    if (!list || !items.length) return;
    wrapper.dataset.resourcesReady = "true";

    const filters = Array.from(wrapper.querySelectorAll("[data-resources-filter]"));
    const pagination = wrapper.querySelector('[data-resources="pagination"]');
    const status = wrapper.querySelector('[data-resources="status"]');
    const perPage = Math.max(1, parseInt(list.getAttribute("data-resources-per-page"), 10) || 4);

    if (!list.id) list.id = `resources-list-${Math.random().toString(36).slice(2, 8)}`;

    const typeOf = (item) => {
      const el = item.querySelector("[data-resource-type]");
      return el ? el.textContent.trim().toLowerCase() : "";
    };
    const types = items.map(typeOf);

    let activeFilter = "all";
    let page = 1;

    function matches() {
      return items.filter((item, i) => activeFilter === "all" || types[i] === activeFilter);
    }

    function pageNumbers(total, current) {
      if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
      const set = new Set([1, total, current - 1, current, current + 1]);
      if (current <= 3) [2, 3].forEach((n) => set.add(n));
      if (current >= total - 2) [total - 1, total - 2].forEach((n) => set.add(n));
      const sorted = Array.from(set).filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
      const out = [];
      sorted.forEach((n, i) => {
        if (i && n - sorted[i - 1] > 1) out.push("gap");
        out.push(n);
      });
      return out;
    }

    function renderPagination(totalPages) {
      if (!pagination) return;
      pagination.innerHTML = "";
      if (totalPages <= 1) {
        pagination.removeAttribute("role");
        pagination.removeAttribute("aria-label");
        return;
      }
      pagination.setAttribute("role", "navigation");
      pagination.setAttribute("aria-label", "Resources pages");
      pageNumbers(totalPages, page).forEach((n) => {
        if (n === "gap") {
          const gap = document.createElement("span");
          gap.className = "resources_page-gap";
          gap.setAttribute("aria-hidden", "true");
          gap.textContent = "...";
          pagination.appendChild(gap);
          return;
        }
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "resources_page";
        btn.textContent = String(n);
        btn.setAttribute("aria-label", `Page ${n}`);
        btn.setAttribute("aria-controls", list.id);
        if (n === page) btn.setAttribute("aria-current", "page");
        btn.addEventListener("click", () => goToPage(n));
        pagination.appendChild(btn);
      });
    }

    function render() {
      const visible = matches();
      const totalPages = Math.max(1, Math.ceil(visible.length / perPage));
      page = Math.min(Math.max(1, page), totalPages);
      const start = (page - 1) * perPage;
      const onPage = new Set(visible.slice(start, start + perPage));
      items.forEach((item) => { item.hidden = !onPage.has(item); });
      renderPagination(totalPages);
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      return { count: visible.length, totalPages };
    }

    function announce(text) {
      if (status) status.textContent = text;
    }

    function scrollToTop() {
      const top = wrapper.getBoundingClientRect().top + window.scrollY - 120;
      if (wrapper.getBoundingClientRect().top >= 0) return;
      if (window.lenis && typeof window.lenis.scrollTo === "function") {
        window.lenis.scrollTo(top, { immediate: reduceMotion.matches });
      } else {
        window.scrollTo({ top, behavior: reduceMotion.matches ? "auto" : "smooth" });
      }
    }

    function goToPage(n) {
      page = n;
      const { totalPages } = render();
      announce(`Page ${page} of ${totalPages}`);
      scrollToTop();
      const current = pagination && pagination.querySelector('[aria-current="page"]');
      if (current) current.focus({ preventScroll: true });
    }

    function setFilter(value) {
      activeFilter = value;
      page = 1;
      filters.forEach((btn) => {
        const on = (btn.getAttribute("data-resources-filter") || "").trim().toLowerCase() === activeFilter;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      const { count } = render();
      announce(`${count} ${count === 1 ? "resource" : "resources"} shown`);
    }

    const onFilterClick = (e) => {
      const btn = e.currentTarget;
      setFilter((btn.getAttribute("data-resources-filter") || "all").trim().toLowerCase());
    };
    filters.forEach((btn) => {
      btn.setAttribute("aria-controls", list.id);
      btn.addEventListener("click", onFilterClick);
    });

    const initial = filters.find((btn) => btn.classList.contains("is-active"));
    activeFilter = initial ? (initial.getAttribute("data-resources-filter") || "all").trim().toLowerCase() : "all";
    setFilter(activeFilter);
    announce("");

    pageCleanups.push(() => {
      filters.forEach((btn) => btn.removeEventListener("click", onFilterClick));
      items.forEach((item) => { item.hidden = false; });
      if (pagination) pagination.innerHTML = "";
      delete wrapper.dataset.resourcesReady;
    });
  });
}
