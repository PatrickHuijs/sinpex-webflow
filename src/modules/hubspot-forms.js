/*
 * HubSpot forms (new form editor embed): Section / Webinar hero form on the Resources template.
 * Markup: div.hs-form-frame[data-region][data-portal-id][data-form-id] (data-form-id bound to the HubSpot form ID prop).
 * HubSpot's own loader (js-eu1.hsforms.net/forms/embed/<portal>.js) scans the page once when it runs and afterwards
 * only watches added nodes five levels deep. Barba inserts the whole page container at once, so a frame nine levels
 * down is never seen and the form stays empty after a page change.
 * - The loader is not in the Webflow custom code: this module adds it once, and only on a page that has a frame.
 *   On that first run the loader scans the page itself and mounts the form.
 * - After a Barba page change (loader already running) every frame without an iframe is swapped for a bare copy of
 *   itself. That copy is an added node the loader's observer does see, so it mounts the form into it.
 * - A frame that already holds an iframe is left alone. Pages without a frame do nothing.
 * No CSS.
 */
function initHubspotForms() {
  const frames = Array.from(document.querySelectorAll(".hs-form-frame"));
  if (!frames.length) return;

  // HubSpot's portal-specific loader, same URL as the embed code: js.hsforms.net for na1, js-<region>.hsforms.net elsewhere
  const region = (frames[0].getAttribute("data-region") || "na1").trim().toLowerCase();
  const portalId = (frames[0].getAttribute("data-portal-id") || "").trim();
  if (!portalId) return;
  const loaderSrc = "https://js" + (region === "na1" ? "" : "-" + region) + ".hsforms.net/forms/embed/" + portalId + ".js";

  // First page with a form: add the loader. It scans the page on its own when it has loaded.
  if (!document.querySelector('script[src="' + loaderSrc + '"]')) {
    const script = document.createElement("script");
    script.src = loaderSrc;
    script.defer = true;
    document.head.appendChild(script);
    return;
  }

  // Loader tag present but not run yet (still downloading): its own scan will find the frames.
  if (!window.__HS__FORMS__EMBED__) return;

  // Loader is running: re-insert each empty frame so its observer picks it up.
  frames.forEach((frame) => {
    if (frame.querySelector("iframe") || !frame.parentNode) return;
    frame.parentNode.replaceChild(frame.cloneNode(false), frame);
  });
}
