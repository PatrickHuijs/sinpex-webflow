/*
 * Back to top button.
 */
function initBackToTop() {
  const buttons = document.querySelectorAll("[data-back-to-top]");
  if (!buttons.length) return;

  buttons.forEach(function (button) {
    if (button.dataset.backToTopBound) return;
    button.dataset.backToTopBound = "true";

    button.addEventListener("click", function (e) {
      e.preventDefault();
      window.lenis.scrollTo(0, {
        duration: 1.2,
        easing: function (t) {
          return Math.min(1, 1.001 - Math.pow(2, -10 * t));
        }
      });
    });
  });
}
