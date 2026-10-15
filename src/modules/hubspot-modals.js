/*
 * Modals: Book a demo + Discuss pricing popups with a HubSpot meetings iframe.
 * Markup (Global Custom Code component, outside the Barba container so it persists between pages):
 *   dialog.modal[data-modal="demo" | "pricing"][data-modal-url="<HubSpot meetings URL>"][aria-label]
 *     .modal_box > button[data-modal-close] + [data-modal-frame] (the iframe is built here on first open)
 * Triggers:
 *   - Any link whose href points to a dialog's data-modal-url (the existing Book a demo / pricing buttons).
 *     Without JS, or with ctrl/cmd/shift/middle click, the link still opens HubSpot in a new tab.
 *   - Any element with [data-modal-open="demo" | "pricing"].
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
    const opener = el.closest("[data-modal-open]");
    if (opener) {
      const name = clean(opener.getAttribute("data-modal-open"));
      return dialogs.find((d) => clean(d.getAttribute("data-modal")) === name) || null;
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
  document.querySelectorAll("a[href], [data-modal-open]").forEach((el) => {
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
