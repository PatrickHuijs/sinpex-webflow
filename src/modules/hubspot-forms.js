/*
 * HubSpot forms, developer embed: the form renders as plain HTML in the page (hsfc-* classes), so the site CSS styles it.
 * Markup: div.hs-form-html[data-region][data-portal-id][data-form-id] on the Resources template
 * (Sign-up form, On-demand form and Event form in the webinar hero; data-form-id bound to the CMS fields).
 * HubSpot's developer loader (js-eu1.hsforms.net/forms/embed/developer/<portal>.js) renders every .hs-form-html on the
 * page when it runs. Afterwards it only renders an element that is itself added to the page, not one inside an added
 * container. Barba inserts the whole page container at once, so after a page change the form stays empty.
 * - The loader is not in the Webflow custom code: this module adds it once, and only on a page that has a form.
 *   On that first run the loader renders the forms on the page itself.
 * - After a Barba page change (loader already on the page) every form HubSpot has not picked up yet (no data-fetched)
 *   is swapped for a bare copy of itself. That copy is an added node the loader does see, so it renders the form.
 * - Elements without a form ID are skipped (HubSpot would not render them either).
 * - Never load the iframe loader (forms/embed/<portal>.js) next to this one: it would mount a second, iframe copy.
 * CSS lives in the webinar hero's embed on the Resources template.
 */
function initHubspotForms() {
  const forms = Array.from(document.querySelectorAll(".hs-form-html")).filter(
    (form) => (form.getAttribute("data-form-id") || "").trim() !== ""
  );
  if (!forms.length) return;

  // HubSpot's developer loader, same URL as the embed code: js.hsforms.net for na1, js-<region>.hsforms.net elsewhere
  const region = (forms[0].getAttribute("data-region") || "na1").trim().toLowerCase();
  const portalId = (forms[0].getAttribute("data-portal-id") || "").trim();
  if (!portalId) return;
  const loaderSrc =
    "https://js" + (region === "na1" ? "" : "-" + region) + ".hsforms.net/forms/embed/developer/" + portalId + ".js";

  // First page with a form: add the loader. It renders the forms on the page on its own when it has loaded.
  if (!document.querySelector('script[src="' + loaderSrc + '"]')) {
    const script = document.createElement("script");
    script.src = loaderSrc;
    script.defer = true;
    document.head.appendChild(script);
    return;
  }

  // Loader already on the page: re-insert each form it has not picked up, so its observer renders it.
  forms.forEach((form) => {
    if (form.dataset.fetched || !form.parentNode) return;
    form.parentNode.replaceChild(form.cloneNode(false), form);
  });
}
