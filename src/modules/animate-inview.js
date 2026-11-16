/*
 * Animated SVG graphics that play only while in view (opt-in: data-animate-inview on the wrapper, e.g. .spx-gfx).
 *
 * An SVG loaded as <img> starts animating on load and can't be paused. This swaps each visible <img> in the wrapper
 * for the same SVG inlined in a shadow root (its <style>, keyframes and ids stay scoped, so generic class names
 * like .a in the SVG don't clash with the page). The animations are then driven with the Web Animations API:
 *   - paused at the start until at least 30% of the graphic is visible, then played from the beginning;
 *   - paused when it leaves the viewport, restarted from the beginning on re-entry.
 * Reduced motion: the SVG's own prefers-reduced-motion rule removes the animations, so the final state shows.
 *
 * Only variants that are displayed get swapped (desktop/mobile via display:none); a variant that becomes visible
 * after a resize is swapped then. The host keeps the <img>'s class (so the page's display rules still pick the variant)
 * and its box (aspect ratio from width/height), so no layout shift. If fetching the SVG fails, the <img> stays as it was. Cleaned up through pageCleanups on Barba.
 */
const ANIMATE_INVIEW_THRESHOLD = 0.3;

function animateInviewSwap(img) {
  img.dataset.animateInviewDone = "pending";
  return fetch(img.currentSrc || img.src)
    .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
    .then((text) => {
      const doc = new DOMParser().parseFromString(text, "image/svg+xml");
      const svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) throw new Error("not an svg");
      svg.querySelectorAll("script, foreignObject").forEach((el) => el.remove());

      const host = document.createElement("div");
      host.className = img.className;
      host.setAttribute("data-animate-inview-host", "");
      const w = parseFloat(img.getAttribute("width")) || svg.viewBox.baseVal.width;
      const h = parseFloat(img.getAttribute("height")) || svg.viewBox.baseVal.height;
      host.style.width = "100%";
      if (w && h) host.style.aspectRatio = w + " / " + h;

      const root = host.attachShadow({ mode: "open" });
      const base = document.createElement("style");
      base.textContent = ":host{display:block}svg{display:block;width:100%;height:100%}";
      root.appendChild(base);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      if (!svg.getAttribute("aria-label") && img.alt && !svg.getAttribute("aria-labelledby")) svg.setAttribute("aria-label", img.alt);
      root.appendChild(document.importNode(svg, true));

      img.replaceWith(host);
      img.dataset.animateInviewDone = "true";
      return host;
    })
    .catch(() => {
      delete img.dataset.animateInviewDone;
      img.dataset.animateInviewFailed = "true";
      return null;
    });
}

function animateInviewAnimations(host) {
  const svg = host.shadowRoot && host.shadowRoot.querySelector("svg");
  return svg && svg.getAnimations ? svg.getAnimations({ subtree: true }) : [];
}

function animateInviewReset(host) {
  animateInviewAnimations(host).forEach((animation) => {
    animation.pause();
    animation.currentTime = 0;
  });
}

function initAnimateInview() {
  const wrappers = Array.from(document.querySelectorAll("[data-animate-inview]"));
  if (!wrappers.length || !("IntersectionObserver" in window) || !document.body.attachShadow) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const host = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= ANIMATE_INVIEW_THRESHOLD) {
          if (host.dataset.animateInviewPlaying) return;
          host.dataset.animateInviewPlaying = "true";
          animateInviewAnimations(host).forEach((animation) => {
            animation.currentTime = 0;
            animation.play();
          });
        } else if (!entry.isIntersecting) {
          if (!host.dataset.animateInviewPlaying) return;
          delete host.dataset.animateInviewPlaying;
          animateInviewReset(host);
        }
      });
    },
    { threshold: [0, ANIMATE_INVIEW_THRESHOLD] }
  );

  function scan() {
    wrappers.forEach((wrapper) => {
      wrapper.querySelectorAll("img").forEach((img) => {
        if (img.dataset.animateInviewDone || img.dataset.animateInviewFailed) return;
        if (getComputedStyle(img).display === "none" || !/\.svg(\?|#|$)/i.test(img.currentSrc || img.src)) return;
        animateInviewSwap(img).then((host) => {
          if (!host || !host.isConnected) return;
          animateInviewReset(host);
          observer.observe(host);
        });
      });
    });
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(scan, 200);
  }

  scan();
  window.addEventListener("resize", onResize);

  pageCleanups.push(() => {
    observer.disconnect();
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeTimer);
  });
}
