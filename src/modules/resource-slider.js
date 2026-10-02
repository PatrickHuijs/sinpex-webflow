/*
 * Resources CMS only / Article image slider: fills the empty slider that sits inside an article's rich text
 * with the images of that item's "Slider images" (multi-image) field. Runs before initImageSlider.
 * Markup: [data-resource-slider="target"] on the empty slider wrapper (also [data-image-slider="wrapper"]), holding .image-slider_track
 *         [data-resource-slider="source"] on the Collection List bound to the Slider images field (Resources template), holding the images
 * - Every image in the source becomes a slide: .image-slider_slide[data-image-slider="slide"] > .image-slider_image-wrap > img.image-slider_img
 * - Order follows the CMS field. The first slider gets the real images, a second slider in the same article gets copies.
 * - Fewer than 2 images, or no source on the page: the slider's section is removed, so no empty block is left in the article.
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
    if (!img.hasAttribute("loading")) img.setAttribute("loading", "lazy");
    wrap.appendChild(img);
    slide.appendChild(wrap);
    return slide;
  }

  targets.forEach((target, index) => {
    const track = target.querySelector(".image-slider_track");
    if (!track || images.length < 2) {
      (target.closest("section") || target).remove();
      return;
    }
    target.dataset.resourceSliderReady = "true";
    images.forEach((img) => track.appendChild(buildSlide(index === 0 ? img : img.cloneNode(true))));
  });

  sources.forEach((source) => source.remove());
}
