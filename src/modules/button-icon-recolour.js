/*
 * Button icon recolour (masked icons).
 */
function initButtonIconRecolour() {
  document.querySelectorAll('.button_icon').forEach(function (img) {
    var wrap = img.parentElement;
    wrap.style.setProperty('--icon', 'url("' + img.src + '")');
    wrap.classList.add('is-masked');
  });
}
