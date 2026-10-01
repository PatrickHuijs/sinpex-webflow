/*
 * Section / Webinar spotlight: left-aligned CMS slider with All / Upcoming / On demand filters. No autoplay.
 * Markup: [data-webinars="wrapper"]
 *           [data-webinars-filter="all" | "upcoming" | "on-demand"] (buttons)
 *           [data-webinars="list"] > [data-webinars="slide"] (each holds a Card / Resource)
 *           [data-webinars="progress"] (bars are built here), [data-webinars="prev"|"next"], [data-webinars="status"]
 * - Status comes from the item date, by calendar day only (no times): today or later = upcoming, before today = on demand.
 *   The date is read from the card's [data-resource-date] text (bound to the Date field), e.g. "August 5, 2026" or "2026-08-05".
 *   An item without a readable date only shows under All.
 * - Order: furthest date first (e.g. Nov, Oct, today, Aug, Jun), in every tab. Items without a readable date go last.
 * - The track moves with GSAP; the last stop is clamped so the row never ends in empty space. One progress bar per stop.
 * - Drag/swipe (Draggable), prev/next buttons, left/right arrow keys. Focusing a card brings it into view.
 * - Mobile (767px and down): no slider. Cards stack and show 3 at a time (data-webinars-mobile-count) with a
 *   [data-webinars="more"] Load More button; each tab starts again at 3.
 * - Switching filter fades the list out, resets to the first slide and fades the new items in; instant with reduced motion.
 * CSS lives in the Section / Webinar spotlight embed.
 */
function initWebinarSlider() {
  const wrappers = document.querySelectorAll('[data-webinars="wrapper"]');
  if (!wrappers.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  // Returns a local Date at midnight, or null when the text can't be read
  function parseDay(text) {
    const t = (text || "").trim().toLowerCase();
    if (!t) return null;
    let m = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    const monthIndex = MONTHS.findIndex((name) => new RegExp("\\b" + name).test(t));
    const year = t.match(/\b(\d{4})\b/);
    if (monthIndex > -1 && year) {
      const day = t.replace(year[0], "").match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
      if (day) return new Date(+year[1], monthIndex, +day[1]);
    }
    m = t.match(/(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/);
    if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
    const parsed = new Date(t);
    return isNaN(parsed) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  function dayOf(slide) {
    const el = slide.querySelector("[data-resource-date]");
    return parseDay(slide.getAttribute("data-webinar-date") || (el ? el.textContent : ""));
  }

  wrappers.forEach((wrapper) => {
    if (wrapper.dataset.webinarsReady) return;

    const list = wrapper.querySelector('[data-webinars="list"]');
    // Furthest date first; items without a readable date go last
    const days = new Map();
    const slides = Array.from(wrapper.querySelectorAll('[data-webinars="slide"]'))
      .map((slide) => { days.set(slide, dayOf(slide)); return slide; })
      .sort((a, b) => (days.get(b) ? days.get(b).getTime() : -Infinity) - (days.get(a) ? days.get(a).getTime() : -Infinity) || 0);
    if (!list || !slides.length) return;
    slides.forEach((slide) => list.appendChild(slide));
    wrapper.dataset.webinarsReady = "true";

    const viewport = list.parentElement;
    const filters = Array.from(wrapper.querySelectorAll("[data-webinars-filter]"));
    const progress = wrapper.querySelector('[data-webinars="progress"]');
    const prevButton = wrapper.querySelector('[data-webinars="prev"]');
    const nextButton = wrapper.querySelector('[data-webinars="next"]');
    const status = wrapper.querySelector('[data-webinars="status"]');
    const controls = progress ? progress.closest(".image-slider_controls") : null;
    const moreButton = wrapper.querySelector('[data-webinars="more"]');
    const mobile = window.matchMedia("(max-width: 767px)");
    const step = Math.max(1, parseInt(wrapper.getAttribute("data-webinars-mobile-count"), 10) || 3);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const statuses = slides.map((slide) => {
      const day = days.get(slide);
      const s = day ? (day.getTime() >= today.getTime() ? "upcoming" : "on-demand") : "";
      if (s) slide.setAttribute("data-webinar-status", s);
      return s;
    });

    if (!list.id) list.id = `webinars-list-${Math.random().toString(36).slice(2, 8)}`;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-roledescription", "carousel");
    if (!wrapper.hasAttribute("aria-label")) wrapper.setAttribute("aria-label", "Webinars");
    if (progress) progress.setAttribute("aria-hidden", "true");
    [prevButton, nextButton].forEach((btn) => { if (btn) btn.setAttribute("aria-controls", list.id); });

    let activeFilter = "all";
    let index = 0;
    let stops = [0];
    let bars = [];
    let dragged = false;
    let shownCount = step;

    const visible = () => slides.filter((slide) => !slide.hidden);
    const ease = () => ({ ease: "osmo-ease", duration: reduceMotion.matches ? 0 : 0.725 });

    // Scroll positions: one per slide, clamped so the last stop fills the viewport
    function measure() {
      const shown = visible();
      if (!shown.length) { stops = [0]; return; }
      const first = shown[0].offsetLeft;
      const last = shown[shown.length - 1];
      const max = Math.max(0, last.offsetLeft + last.offsetWidth - first - viewport.clientWidth);
      const raw = shown.map((slide) => Math.min(slide.offsetLeft - first, max));
      stops = raw.filter((x, i) => i === 0 || x - raw[i - 1] > 1);
      if (draggable) draggable.applyBounds({ minX: -max, maxX: 0 });
    }

    function buildBars() {
      if (!progress) return;
      progress.innerHTML = "";
      bars = stops.map(() => {
        const bar = document.createElement("div");
        bar.className = "image-slider_bar";
        const fill = document.createElement("div");
        fill.className = "image-slider_bar-fill";
        bar.appendChild(fill);
        progress.appendChild(bar);
        return bar;
      });
    }

    function update() {
      bars.forEach((bar, i) => bar.classList.toggle("is-active", i === index));
      if (prevButton) prevButton.disabled = index <= 0;
      if (nextButton) nextButton.disabled = index >= stops.length - 1;
      if (controls) controls.classList.toggle("is-hidden", stops.length <= 1);
    }

    function goTo(i, vars) {
      index = Math.max(0, Math.min(stops.length - 1, i));
      gsap.to(list, Object.assign({ x: -stops[index], overwrite: true }, vars || ease()));
      update();
      if (status) status.textContent = `Slide ${index + 1} of ${stops.length}`;
    }

    function closestStop(x) {
      let best = 0;
      stops.forEach((s, i) => { if (Math.abs(s - x) < Math.abs(stops[best] - x)) best = i; });
      return best;
    }

    // Drag / swipe
    let draggable = null;
    if (typeof Draggable === "function") {
      draggable = Draggable.create(list, {
        type: "x",
        dragClickables: true,
        allowNativeTouchScrolling: true,
        minimumMovement: 6,
        edgeResistance: 0.85,
        bounds: { minX: 0, maxX: 0 },
        onPress() { gsap.killTweensOf(list); dragged = false; },
        onDrag() { dragged = true; },
        onRelease() { goTo(closestStop(-this.x)); }
      })[0];
      list.classList.add("is-draggable");
    }
    // A drag that ends on a link should not open it
    const onClickCapture = (e) => {
      if (!dragged) return;
      e.preventDefault();
      e.stopPropagation();
      dragged = false;
    };
    list.addEventListener("click", onClickCapture, true);

    const onPrev = () => goTo(index - 1);
    const onNext = () => goTo(index + 1);
    const onKey = (e) => {
      if (mobile.matches || e.target.closest("[data-webinars-filter]")) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); onPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); onNext(); }
    };
    // Keyboard focus on a card off screen brings it into view
    const onFocusIn = (e) => {
      if (mobile.matches) return;
      const slide = e.target.closest('[data-webinars="slide"]');
      if (!slide || slide.hidden) return;
      viewport.scrollLeft = 0;
      const shown = visible();
      const offset = slide.offsetLeft - shown[0].offsetLeft;
      const box = slide.getBoundingClientRect();
      const view = viewport.getBoundingClientRect();
      if (box.left < view.left || box.right > view.right) goTo(closestStop(offset));
    };

    if (prevButton) prevButton.addEventListener("click", onPrev);
    if (nextButton) nextButton.addEventListener("click", onNext);
    wrapper.addEventListener("keydown", onKey);
    wrapper.addEventListener("focusin", onFocusIn);

    const matching = () => slides.filter((slide, i) => activeFilter === "all" || statuses[i] === activeFilter);

    // Desktop/tablet: every matching item in the slider. Mobile: a stacked list showing `shownCount` items plus Load More.
    function applyVisibility() {
      const items = matching();
      slides.forEach((slide) => { slide.hidden = true; });
      items.forEach((slide, i) => { slide.hidden = mobile.matches && i >= shownCount; });
      if (moreButton) {
        moreButton.hidden = !mobile.matches || items.length <= shownCount;
        moreButton.setAttribute("aria-controls", list.id);
      }
      if (draggable) {
        if (mobile.matches) draggable.disable(); else draggable.enable();
      }
      list.classList.toggle("is-draggable", !!draggable && !mobile.matches);
      return items.length;
    }

    function render() {
      shownCount = step;
      const count = applyVisibility();
      gsap.set(list, { x: 0 });
      index = 0;
      measure();
      buildBars();
      update();
      if (status) status.textContent = `${count} ${count === 1 ? "webinar" : "webinars"} shown`;
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }

    // Mobile: show the next batch, fade it in and move focus to its first card
    const onMore = () => {
      const before = visible();
      shownCount += step;
      applyVisibility();
      const added = visible().filter((slide) => before.indexOf(slide) === -1);
      if (!added.length) return;
      if (!reduceMotion.matches) {
        gsap.fromTo(added,
          { opacity: 0, y: "0.75rem" },
          { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", clearProps: "opacity,transform" }
        );
      }
      const focusTarget = added[0].querySelector("a, button, [tabindex]");
      if (focusTarget) focusTarget.focus({ preventScroll: true });
      if (status) status.textContent = `${visible().length} of ${matching().length} webinars shown`;
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    if (moreButton) moreButton.addEventListener("click", onMore);

    // Switching between mobile and larger screens rebuilds the view
    const onModeChange = () => render();
    if (typeof mobile.addEventListener === "function") mobile.addEventListener("change", onModeChange);

    // Fade the list out, swap the items, fade the new items in together. Instant with reduced motion.
    function setFilter(value, animate) {
      activeFilter = value;
      filters.forEach((btn) => {
        const on = (btn.getAttribute("data-webinars-filter") || "").trim().toLowerCase() === activeFilter;
        btn.classList.toggle("is-active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      gsap.killTweensOf(viewport);
      gsap.killTweensOf(slides);
      if (!animate || reduceMotion.matches) {
        gsap.set(viewport, { clearProps: "opacity" });
        render();
        return;
      }
      gsap.to(viewport, {
        opacity: 0,
        duration: 0.2,
        ease: "power1.out",
        onComplete: () => {
          render();
          gsap.set(viewport, { opacity: 1 });
          gsap.fromTo(visible(),
            { opacity: 0, y: "0.75rem" },
            { opacity: 1, y: 0, duration: 0.45, ease: "power2.out", clearProps: "opacity,transform" }
          );
        }
      });
    }

    const onFilterClick = (e) => {
      const value = (e.currentTarget.getAttribute("data-webinars-filter") || "all").trim().toLowerCase();
      if (value !== activeFilter) setFilter(value, true);
    };
    filters.forEach((btn) => {
      btn.setAttribute("aria-controls", list.id);
      btn.addEventListener("click", onFilterClick);
    });

    const onResize = () => {
      measure();
      if (bars.length !== stops.length) buildBars();
      goTo(index, { duration: 0 });
    };
    window.addEventListener("resize", onResize);

    const initial = filters.find((btn) => btn.classList.contains("is-active"));
    setFilter(initial ? (initial.getAttribute("data-webinars-filter") || "all").trim().toLowerCase() : "all");
    if (status) status.textContent = "";

    pageCleanups.push(() => {
      window.removeEventListener("resize", onResize);
      filters.forEach((btn) => btn.removeEventListener("click", onFilterClick));
      if (moreButton) { moreButton.removeEventListener("click", onMore); moreButton.hidden = false; }
      if (typeof mobile.removeEventListener === "function") mobile.removeEventListener("change", onModeChange);
      if (prevButton) prevButton.removeEventListener("click", onPrev);
      if (nextButton) nextButton.removeEventListener("click", onNext);
      wrapper.removeEventListener("keydown", onKey);
      wrapper.removeEventListener("focusin", onFocusIn);
      list.removeEventListener("click", onClickCapture, true);
      if (draggable) draggable.kill();
      gsap.killTweensOf([list, viewport, ...slides]);
      gsap.set([list, viewport, ...slides], { clearProps: "opacity,transform" });
      slides.forEach((slide) => { slide.hidden = false; });
      list.classList.remove("is-draggable");
      if (progress) progress.innerHTML = "";
      delete wrapper.dataset.webinarsReady;
    });
  });
}
