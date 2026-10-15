/*
 * Lottie: plays a Lottie (.json URL, e.g. on Bunny) when it scrolls into view. Based on Osmo's Lottie Setup.
 * Markup: [data-lottie][data-lottie-src="<url to .json>"] (optional [data-lottie-frame="<n>"]: still frame for reduced motion)
 *   Layer feature: div.layer-feature_lottie inside .layer-feature_visual, src bound to the Lottie URL prop.
 *   Empty src: the element is hidden by CSS and the image shows instead (Section / Layer features embed).
 * - lottie-web is only fetched on pages that have a Lottie with a src, once, from jsDelivr.
 * - Each Lottie loads when it is half a viewport away, plays in view and pauses out of view.
 * - Reduced motion: shows a still frame (data-lottie-frame, default 0) instead of playing.
 * - If the file fails to load, [data-lottie-failed] is set so the CSS shows the image again.
 * - Destroyed on Barba page changes.
 */
const LOTTIE_LIB = "https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js";
let lottieLibPromise = null;

function loadLottieLib() {
  if (window.lottie) return Promise.resolve(window.lottie);
  if (lottieLibPromise) return lottieLibPromise;
  lottieLibPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LOTTIE_LIB;
    script.async = true;
    script.onload = () => (window.lottie ? resolve(window.lottie) : reject(new Error("lottie-web missing")));
    script.onerror = () => {
      lottieLibPromise = null;
      reject(new Error("lottie-web failed to load"));
    };
    document.head.appendChild(script);
  });
  return lottieLibPromise;
}

function initLottieAnimations() {
  const targets = Array.from(document.querySelectorAll("[data-lottie]")).filter(
    (el) => (el.getAttribute("data-lottie-src") || "").trim() !== ""
  );
  if (!targets.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const anims = [];
  let destroyed = false;

  pageCleanups.push(() => {
    destroyed = true;
    anims.forEach((anim) => { try { anim.destroy(); } catch (e) {} });
    targets.forEach((el) => {
      el.removeAttribute("data-lottie-fired");
      el.removeAttribute("data-lottie-failed");
    });
  });

  const fail = (target) => target.setAttribute("data-lottie-failed", "true");

  targets.forEach((target) => {
    let anim = null;
    let inView = false;

    function create() {
      target.setAttribute("data-lottie-fired", "true");
      loadLottieLib().then((lottie) => {
        if (destroyed || !document.contains(target)) return;
        anim = lottie.loadAnimation({
          container: target,
          renderer: "svg",
          loop: true,
          autoplay: false,
          path: target.getAttribute("data-lottie-src").trim()
        });
        anims.push(anim);
        anim.addEventListener("data_failed", () => fail(target));
        anim.addEventListener("DOMLoaded", () => {
          if (reduceMotion) {
            anim.goToAndStop(parseInt(target.getAttribute("data-lottie-frame") || "0", 10) || 0, true);
          } else if (inView) {
            anim.play();
          }
        });
      }).catch(() => fail(target));
    }

    // Load half a viewport early
    ScrollTrigger.create({
      trigger: target,
      start: "top bottom+=50%",
      end: "bottom top-=50%",
      onEnter: () => { if (!target.hasAttribute("data-lottie-fired")) create(); },
      onEnterBack: () => { if (!target.hasAttribute("data-lottie-fired")) create(); }
    });

    // Play only while visible
    ScrollTrigger.create({
      trigger: target,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        inView = self.isActive;
        if (!anim || reduceMotion || !anim.isLoaded) return;
        if (inView) anim.play();
        else anim.pause();
      }
    });
  });
}
