/*
 * Section / Layers: full sticky stack. Every row sticks at the same top (--layer-stack-top) and fully
 * covers the previous one; all rows release together. CSS stays in the Section / Layers embed.
 * The script gives each row an invisible margin tail down to the release point (the bottom of the
 * tallest stuck row), so rows of different heights still release at the same moment, and pulls the
 * next row back up by the same amount so the layout does not move.
 */
(function () {
  if (window.__layerStack) {
    window.__layerStack.init();
    return;
  }

  function getItems(list) {
    return Array.prototype.filter.call(list.children, function (el) {
      return el.classList.contains('layer-item');
    });
  }

  function clear(list, items) {
    list.style.removeProperty('--layer-list-mb');
    items.forEach(function (item) {
      item.style.removeProperty('--layer-mt');
      item.style.removeProperty('--layer-mb');
    });
  }

  function update(list) {
    var items = getItems(list);
    if (items.length < 2) return clear(list, items);

    var first = getComputedStyle(items[0]);
    if (first.position !== 'sticky' || isNaN(parseFloat(first.top))) return clear(list, items);

    // Measure without the previous tails so heights are the rows' own heights
    clear(list, items);
    var heights = items.map(function (item) { return item.getBoundingClientRect().height; });

    // All rows share the same top, so they release once the tallest row's bottom is reached
    var tallest = Math.max.apply(null, heights);

    items[0].style.setProperty('--layer-mt', '0px');
    for (var k = 0; k < items.length; k++) {
      var tail = Math.max(0, tallest - heights[k]);
      items[k].style.setProperty('--layer-mb', tail + 'px');
      if (items[k + 1]) {
        items[k + 1].style.setProperty('--layer-mt', (-tail) + 'px');
      } else {
        list.style.setProperty('--layer-list-mb', (-tail) + 'px');
      }
    }
  }

  function init() {
    document.querySelectorAll('.layer-list').forEach(function (list) {
      if (!list.__layerStackObserved && 'ResizeObserver' in window) {
        list.__layerStackObserved = true;
        var ro = new ResizeObserver(function () { update(list); });
        getItems(list).forEach(function (item) { ro.observe(item); });
        // Disconnect before a Barba page change so the old page's list can be released
        pageCleanups.push(function () {
          ro.disconnect();
          list.__layerStackObserved = false;
        });
      }
      update(list);
    });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 100);
  });

  // Started by master-init (first load and after every Barba transition); re-measured once images have loaded
  window.addEventListener('load', init);
  window.initLayerStack = init;

  window.__layerStack = { init: init };
})();
