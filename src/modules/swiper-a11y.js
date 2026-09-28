/*
 * Swiper accessibility fixes.
 */
function fixSwiperRoles() {
  document.querySelectorAll('[role="list"].swiper-wrapper').forEach(list => {
    list.querySelectorAll('[role="group"]').forEach(child => {
      child.setAttribute('role', 'listitem');
    });
  });
}

function initSwiperAccessibility() {
  setTimeout(fixSwiperRoles, 300);
}
