/*
 * CSS logo marquee controller.
 */
function initCSSMarquee() {
  const pixelsPerSecond = 75;
  const marquees = document.querySelectorAll('[data-css-marquee]');
  if (!marquees.length) return;

  const resizeObservers = [];

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      entry.target.querySelectorAll('[data-css-marquee-list]').forEach(list =>
        list.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
      );
    });
  }, { threshold: 0 });

  marquees.forEach(marquee => {
    const list = marquee.querySelector('[data-css-marquee-list]');
    if (!list) return;

    marquee.querySelectorAll('img[loading="lazy"]').forEach(img => img.loading = 'eager');

    let lastWidth = 0;

    const update = () => {
      const listWidth = list.offsetWidth;
      const fits = listWidth <= marquee.clientWidth;
      const status = marquee.dataset.cssMarqueeStatus;

      if (fits) {
        if (status === 'static') return;
        marquee.querySelectorAll('[data-css-marquee-clone]').forEach(clone => clone.remove());
        list.style.animation = '';
        observer.unobserve(marquee);
        marquee.dataset.cssMarqueeStatus = 'static';
        return;
      }

      if (status === 'active' && listWidth === lastWidth) return;
      lastWidth = listWidth;

      if (!marquee.querySelector('[data-css-marquee-clone]')) {
        const clone = list.cloneNode(true);
        clone.setAttribute('data-css-marquee-clone', '');
        clone.setAttribute('aria-hidden', 'true');
        marquee.appendChild(clone);
      }

      marquee.dataset.cssMarqueeStatus = 'active';

      const duration = (listWidth / pixelsPerSecond) + 's';
      marquee.querySelectorAll('[data-css-marquee-list]').forEach(l => {
        l.style.animation = 'none';
        void l.offsetWidth;
        l.style.animation = '';
        l.style.animationDuration = duration;
      });

      observer.unobserve(marquee);
      observer.observe(marquee);
    };

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(list);
    resizeObserver.observe(marquee);
    resizeObservers.push(resizeObserver);
  });

  pageCleanups.push(() => {
    observer.disconnect();
    resizeObservers.forEach(ro => ro.disconnect());
  });
}
