/*
 * Section / Layers: partial sticky stack. Each row covers the previous one at the same distance
 * from the bottom of the previous title and all rows release together. CSS stays in the
 * Section / Layers embed (--layer-stack-top, --layer-stack-cut).
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
      item.style.removeProperty('--layer-top');
      item.style.removeProperty('--layer-mt');
      item.style.removeProperty('--layer-mb');
    });
  }

  // Distance from the top of a row to the point where the next row should cover it
  function visibleStrip(item, cut) {
    var title = item.querySelector('h1, h2, h3, h4, h5, h6');
    var itemTop = item.getBoundingClientRect().top;
    if (!title) return item.getBoundingClientRect().height;
    var cs = getComputedStyle(title);
    var lineHeight = parseFloat(cs.lineHeight);
    if (isNaN(lineHeight)) lineHeight = parseFloat(cs.fontSize) * 1.2;
    return title.getBoundingClientRect().bottom - itemTop - lineHeight * cut;
  }

  function update(list) {
    var items = getItems(list);
    if (items.length < 2) return clear(list, items);

    var first = getComputedStyle(items[0]);
    var firstTop = parseFloat(first.top);
    if (first.position !== 'sticky' || isNaN(firstTop)) return clear(list, items);

    var cut = parseFloat(getComputedStyle(list).getPropertyValue('--layer-stack-cut'));
    if (isNaN(cut)) cut = 0.4;

    // 1. Sticky positions: each row sits one visible strip below the previous row
    var tops = [firstTop];
    var heights = [];
    for (var i = 0; i < items.length; i++) {
      heights.push(items[i].getBoundingClientRect().height);
      if (i > 0) {
        tops.push(tops[i - 1] + visibleStrip(items[i - 1], cut));
        items[i].style.setProperty('--layer-top', tops[i] + 'px');
      }
    }

    // 2. The point where every row releases: the lowest stuck bottom edge
    var release = 0;
    for (var j = 0; j < items.length; j++) {
      release = Math.max(release, tops[j] + heights[j]);
    }

    // 3. Each row gets a margin tail down to the release point; the next row pulls back up by the same amount so the layout does not move
    items[0].style.setProperty('--layer-mt', '0px');
    for (var k = 0; k < items.length; k++) {
      var tail = Math.max(0, release - tops[k] - heights[k]);
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
      }
      update(list);
    });
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 100);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  window.addEventListener('load', init);

  if (window.barba && window.barba.hooks) {
    window.barba.hooks.after(init);
  }

  window.__layerStack = { init: init };
})();
