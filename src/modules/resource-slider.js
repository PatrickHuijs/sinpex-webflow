/*
 * Resources CMS only / Article image slider: fills the empty slider that sits inside an article's rich text
 * with the images of that item's "Slider images" (multi-image) field. Runs before initImageSlider.
 * Markup: [data-resource-slider="target"] on the empty slider wrapper (also [data-image-slider="wrapper"]), holding .image-slider_track
 *         [data-resource-slider="source"] on the Collection List bound to the Slider images field (Resources template), holding the images
 * - Every image in the source becomes a slide: .image-slider_slide[data-image-slider="slide"] > .image-slider_image-wrap > img.image-slider_img
 * - Order follows the CMS field. The first slider gets the real images, a second slider in the same article gets copies.
 * - Images keep their own proportions: the CSS fixes the height, and each image frame gets the image's aspect ratio inline,
 *   so the width follows. The loop measures slide widths, so the image slider only starts once the images have loaded
 *   (or after 4 seconds); until then the row sits still.
 * - 1 image: shown as a static, centred image. The wrapper gets data-resource-slider-single and stops being a slider
 *   (data-image-slider is taken off, so image-slider.js skips it); CSS hides the bars and arrows.
 * - No images, or no source on the page: the slider's section is removed, so no empty block is left in the article.
 * - The source list is removed after use. From there modules/image-slider.js takes over (loop, drag, bars, autoplay).
 * CSS lives in the Resources CMS only / Article image slider embed.
 */
function initResourceSlider() {
  const targets = Array.from(document.querySelectorAll('[data-resource-slider="target"]'))
    .filter((target) => !target.dataset.resourceSliderReady);
  const sources = Array.from(document.querySelectorAll('[data-resource-slider="source"]'));
  if (!targets.length) return;

  const images = [];
  sources.forEach((source) => {
    source.querySelectorAll("img").forEach((img) => { if (img.getAttribute("src")) images.push(img); });
  });

  function buildSlide(img) {
    const slide = document.createElement("div");
    slide.className = "image-slider_slide";
    slide.setAttribute("data-image-slider", "slide");
    const wrap = document.createElement("div");
    wrap.className = "image-slider_image-wrap";
    img.className = "image-slider_img";
    img.removeAttribute("id");
    if (!img.hasAttribute("alt")) img.setAttribute("alt", "");
    img.setAttribute("loading", "eager"); // widths are needed before the loop starts
    wrap.appendChild(img);
    slide.appendChild(wrap);
    return slide;
  }

  targets.forEach((target, index) => {
    const track = target.querySelector(".image-slider_track");
    if (!track || !images.length) {
      (target.closest("section") || target).remove();
      return;
    }
    target.dataset.resourceSliderReady = "true";
    if (images.length === 1) {
      target.setAttribute("data-resource-slider-single", "");
      target.removeAttribute("data-image-slider");
      target.removeAttribute("aria-label");
    }
    const placed = images.map((img) => (index === 0 ? img : img.cloneNode(true)));
    placed.forEach((img) => track.appendChild(buildSlide(img)));

    // The slide width comes from the image's own proportions, set as an aspect ratio on its frame.
    // That way the hidden copies the image slider adds have the right width straight away, before their image loads.
    const hasSize = (img) => img.complete && img.naturalWidth > 0;
    const setRatio = (img) => {
      if (hasSize(img)) img.parentElement.style.aspectRatio = img.naturalWidth + " / " + img.naturalHeight;
    };
    placed.forEach(setRatio);
    if (placed.length < 2) {
      placed.forEach((img) => { if (!hasSize(img)) img.addEventListener("load", () => setRatio(img), { once: true }); });
      return;
    }

    // Hold the image slider back until every image has its size, then start it
    const waiting = placed.filter((img) => !hasSize(img));
    if (!waiting.length) return;
    target.dataset.imageSliderReady = "pending";
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      placed.forEach(setRatio);
      if (!target.isConnected || target.dataset.imageSliderReady !== "pending") return;
      delete target.dataset.imageSliderReady;
      if (typeof initImageSlider === "function") initImageSlider();
    };
    let left = waiting.length;
    const done = () => { left -= 1; if (left <= 0) start(); };
    waiting.forEach((img) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
    setTimeout(start, 4000);
  });

  sources.forEach((source) => source.remove());
}
