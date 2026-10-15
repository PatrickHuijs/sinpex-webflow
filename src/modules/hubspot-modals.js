/*
 * Modals: HubSpot meetings popups (book-a-demo-en, book-a-demo-de, book-a-demo-pricing-en, book-a-demo-pricing-de).
 * Markup: Modal / HubSpot component instances in Global Custom Code (outside the Barba container, so they persist):
 *   dialog.modal[data-modal="<Popup prop>"][data-modal-url="<HubSpot URL prop>"][aria-label="<Label prop>"]
 *     .modal_box > button[data-modal-close] + [data-modal-frame] (the iframe is built here on first open)
 * Triggers (first match wins):
 *   1. [data-modal-open="<popup name>"] on the button or a parent: the Popup prop on Button Main.
 *      Empty or unknown value: the button just follows its link (step 2 or a normal click).
 *   2. Any link whose href points to a dialog's data-modal-url (the HubSpot meetings links).
 *   Ctrl/cmd/shift/middle clicks and no-JS still follow the link.
 * - Closes with the X button, Escape (native dialog) and a click on the dark overlay.
 * - Focus moves into the dialog on open and back to the button on close; the page behind doesn't scroll.
 * - The iframe is only loaded on first open, so pages don't load HubSpot up front.
 * - Attribute values are read case-insensitively; the URL match ignores query, hash, trailing slash and case.
 * CSS lives in the Global Custom Code component (MODALS embed).
 */
function initHubspotModals() {
  const dialogs = Array.from(document.querySelectorAll("dialog[data-modal]"));
  if (!dialogs.length || typeof HTMLDialogElement !== "function") return;

  const clean = (value) => (value || "").trim().toLowerCase();
  const normalizeUrl = (href) => {
    try {
      const url = new URL(href, window.location.href);
      return (url.origin + url.pathname).replace(/\/+$/, "").toLowerCase();
    } catch (e) {
      return "";
    }
  };

  // Find the dialog a clicked element should open, or null
  const dialogFor = (el) => {
    // Popup prop on a button: wins over the link. Empty or unknown value: fall back to the link.
    const opener = el.closest("[data-modal-open]");
    if (opener) {
      const name = clean(opener.getAttribute("data-modal-open"));
      const named = name && dialogs.find((d) => clean(d.getAttribute("data-modal")) === name);
      if (named) return named;
    }
    const link = el.closest("a[href]");
    if (!link) return null;
    const href = normalizeUrl(link.getAttribute("href"));
    if (!href) return null;
    return dialogs.find((d) => {
      const url = normalizeUrl(d.getAttribute("data-modal-url"));
      return url && url === href;
    }) || null;
  };

  // Mark the triggers on this page so assistive tech announces a popup
  document.querySelectorAll("a[href], button").forEach((el) => {
    if (dialogFor(el)) el.setAttribute("aria-haspopup", "dialog");
  });

  // Close any popup left open from the previous page (Barba keeps the dialogs)
  dialogs.forEach((d) => { if (d.open) d.close(); });

  // Everything below binds once: the dialogs persist across Barba page changes
  if (window.sinpexModalsReady) return;
  window.sinpexModalsReady = true;

  let lastTrigger = null;

  function buildFrame(dialog) {
    const frame = dialog.querySelector("[data-modal-frame]");
    const url = (dialog.getAttribute("data-modal-url") || "").trim();
    if (!frame || !url || frame.querySelector("iframe")) return;
    const src = url + (url.indexOf("?") === -1 ? "?" : "&") + "embed=true";
    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = dialog.getAttribute("aria-label") || "Booking form";
    iframe.setAttribute("allow", "fullscreen");
    frame.appendChild(iframe);
  }

  function openModal(dialog, trigger) {
    if (dialog.open) return;
    lastTrigger = trigger || document.activeElement;
    buildFrame(dialog);
    dialog.showModal();
    document.documentElement.classList.add("is-modal-open");
    if (window.lenis && typeof window.lenis.stop === "function") window.lenis.stop();
  }

  dialogs.forEach((dialog) => {
    // Runs for every way of closing: X button, Escape, overlay click, page change
    dialog.addEventListener("close", () => {
      document.documentElement.classList.remove("is-modal-open");
      if (window.lenis && typeof window.lenis.start === "function") window.lenis.start();
      if (lastTrigger && document.contains(lastTrigger) && typeof lastTrigger.focus === "function") {
        lastTrigger.focus({ preventScroll: true });
      }
      lastTrigger = null;
    });

    // A click on the dialog element itself (not its box) is a click on the dark overlay
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    dialog.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => dialog.close());
    });
  });

  // Capture phase: runs before Barba and other link handlers
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const target = e.target instanceof Element ? e.target : null;
    if (!target || target.closest("dialog[data-modal]")) return;
    const dialog = dialogFor(target);
    if (!dialog) return;
    e.preventDefault();
    e.stopPropagation();
    openModal(dialog, target.closest("a, button, [data-modal-open]"));
  }, true);
}
