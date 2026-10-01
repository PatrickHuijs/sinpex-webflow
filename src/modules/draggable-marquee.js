/*
 * Section / Hero marquee: one-way infinite image marquee, based on Osmo's Draggable Marquee (Directional).
 * Markup: [data-draggable-marquee-init] > [data-draggable-marquee-collection] > [data-draggable-marquee-list] > [data-marquee-item] > img[data-marquee-parallax]
 *
 * - Moves left to right by default. data-marquee-reverse="true" (prop "Right to left") flips it.
 * - Dragging in the travel direction speeds it up, then it eases back. Dragging the other way is ignored, so it never reverses.
 * - data-duration: seconds per full loop (prop "Speed"). data-multiplier: max speed-up. data-sensitivity: drag velocity -> speed.
 * - Each image drifts a little sideways depending on where it is on screen (horizontal parallax).
 * - Pauses off screen, rebuilds on resize, static with prefers-reduced-motion. CSS lives in the Section / Hero marquee embed.
 * No GSAP Observer needed: drag velocity comes from pointer events.
 */
function initDraggableMarquee() {
  const wrappers = document.querySelectorAll("[data-draggable-marquee-init]");
  if (!wrappers.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const getNumber = (el, name, fallback) => {
    const value = parseFloat(el.getAttribute(name));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };

  wrappers.forEach((wrapper) => {
    if (wrapper.getAttribute("data-draggable-marquee-init") === "initialized") return;

    const collection = wrapper.querySelector("[data-draggable-marquee-collection]");
    const list = wrapper.querySelector("[data-draggable-marquee-list]");
    if (!collection || !list) return;

    wrapper.setAttribute("data-draggable-marquee-init", "initialized");

    const duration = getNumber(wrapper, "data-duration", 40);
    const multiplier = getNumber(wrapper, "data-multiplier", 25);
    const sensitivity = getNumber(wrapper, "data-sensitivity", 0.01);
    // +1 = items travel left to right, -1 = right to left
    const direction = (wrapper.getAttribute("data-marquee-reverse") || "").toLowerCase() === "true" ? -1 : 1;
    wrapper.setAttribute("data-direction", direction > 0 ? "right" : "left");

    list.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      img.draggable = false;
    });

    let listWidth = 0;
    let wrapX = (x) => x;
    let position = 0;
    let parallaxItems = [];
    const boost = { value: 1 };
    let visible = true;
    let started = false;

    function build() {
      collection.querySelectorAll("[data-draggable-marquee-clone]").forEach((clone) => clone.remove());

      const wrapperWidth = wrapper.getBoundingClientRect().width;
      listWidth = list.scrollWidth || list.getBoundingClientRect().width;
      if (!wrapperWidth || !listWidth) return false;

      // Enough copies to cover the screen plus one list width of travel
      const minRequiredWidth = wrapperWidth + listWidth + 2;
      while (collection.scrollWidth < minRequiredWidth) {
        const clone = list.cloneNode(true);
        clone.setAttribute("data-draggable-marquee-clone", "");
        clone.setAttribute("aria-hidden", "true");
        clone.querySelectorAll("img").forEach((img) => { img.alt = ""; });
        collection.appendChild(clone);
      }

      wrapX = gsap.utils.wrap(-listWidth, 0);

      // Cache item offsets so the parallax needs no layout reads per frame
      parallaxItems = Array.from(collection.querySelectorAll("[data-marquee-item]")).map((item) => ({
        img: item.querySelector("[data-marquee-parallax]"),
        left: item.offsetLeft,
        width: item.offsetWidth
      })).filter((entry) => entry.img);

      // First build: start with the second image centred, as in the design
      if (!started && parallaxItems[1]) {
        const second = parallaxItems[1];
        position = wrapperWidth / 2 - (second.left + second.width / 2);
        started = true;
      }

      render();
      return true;
    }

    function render() {
      const x = wrapX(position);
      gsap.set(collection, { x: x });

      if (reduceMotion) return;
      const viewport = wrapper.clientWidth;
      const centre = viewport / 2;
      parallaxItems.forEach((entry) => {
        const itemCentre = entry.left + x + entry.width / 2;
        const range = centre + entry.width / 2;
        const progress = gsap.utils.clamp(-1, 1, (itemCentre - centre) / range);
        // Image is 112% wide, so up to ~5% of its width can shift without showing an edge
        gsap.set(entry.img, { xPercent: progress * -5 });
      });
    }

    function tick(time, deltaTime) {
      if (!visible || !listWidth) return;
      const speed = listWidth / duration; // px per second
      position += direction * speed * boost.value * (Math.min(deltaTime, 64) / 1000);
      render();
    }

    // Drag: only movement in the travel direction speeds it up
    let dragging = false;
    let lastX = 0;
    let lastTime = 0;

    function onPointerDown(e) {
      dragging = true;
      lastX = e.clientX;
      lastTime = performance.now();
      wrapper.setAttribute("data-marquee-dragging", "");
    }

    function onPointerMove(e) {
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max(now - lastTime, 1) / 1000;
      const velocity = (e.clientX - lastX) / dt; // px per second, + is to the right
      lastX = e.clientX;
      lastTime = now;

      if (Math.sign(velocity) !== direction) return;

      const target = gsap.utils.clamp(1, multiplier, Math.abs(velocity) * sensitivity);
      if (target <= boost.value) return;

      gsap.killTweensOf(boost);
      gsap.timeline()
        .to(boost, { value: target, duration: 0.1, overwrite: true })
        .to(boost, { value: 1, duration: 1, ease: "power2.out" });
    }

    function onPointerUp() {
      dragging = false;
      wrapper.removeAttribute("data-marquee-dragging");
    }

    if (!build()) {
      // Images not laid out yet: retry once everything has loaded
      window.addEventListener("load", build, { once: true });
    }

    if (!reduceMotion) {
      gsap.ticker.add(tick);
      wrapper.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    }

    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    io.observe(wrapper);

    let lastWidth = wrapper.clientWidth;
    const ro = new ResizeObserver(() => {
      if (wrapper.clientWidth === lastWidth) return;
      lastWidth = wrapper.clientWidth;
      build();
    });
    ro.observe(wrapper);

    // Late-loading images change the list width
    list.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", build, { once: true });
    });

    pageCleanups.push(() => {
      gsap.ticker.remove(tick);
      gsap.killTweensOf(boost);
      wrapper.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("load", build);
      io.disconnect();
      ro.disconnect();
    });
  });
}
