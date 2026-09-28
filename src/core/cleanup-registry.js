/*
 * Page cleanup registry. Anything that adds a global listener, observer or repeating timeline registers its teardown here.
 */
// Anything that adds a global listener, observer, or repeating timeline
// registers its teardown here. runPageCleanups() runs before every re-init.
let pageCleanups = [];
function runPageCleanups() {
  pageCleanups.forEach(fn => { try { fn(); } catch (e) {} });
  pageCleanups = [];
}
