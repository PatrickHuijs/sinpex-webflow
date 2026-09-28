/*
 * Platform card stack scroll effect. CSS stays in Webflow.
 */
function initCardStack() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const stacks = document.querySelectorAll('.platform-card_stack');
  if (!stacks.length) return;

  const pairs = [];
  const fades = [];

  stacks.forEach(stack => {
    const cards = Array.from(stack.children);
    if (cards.length < 2) return;

    const offset  = parseFloat(stack.dataset.stackOffset) || 0;
    const opacity = parseFloat(stack.dataset.stackOpacity) || 0;
    const scale   = parseFloat(stack.dataset.stackScale)   || 0.94;

    cards.forEach((card, i) => {
      card.style.top = `calc(var(--stack-top) + ${i * offset}px)`;
      card.style.zIndex = i + 1;
      card.style.transformOrigin = '50% 0%';

      const next = cards[i + 1];
      if (!next) return;

      pairs.push({ card, next, scale, setScale: gsap.quickSetter(card, 'scale') });

      // Fade while the next card travels from this card's bottom to its sticky top
      const fade = card.querySelector('.grid-2-col.is-platform-card');
      if (!fade) return;
      const stickyTop = el => parseFloat(getComputedStyle(el).top) || 0;
      fades.push(gsap.fromTo(fade, { opacity: 1 }, {
        opacity,
        ease: 'none',
        scrollTrigger: {
          trigger: next,
          start: () => `top ${stickyTop(card) + card.offsetHeight}px`,
          end: () => `top ${stickyTop(next)}px`,
          scrub: true,
          invalidateOnRefresh: true
        }
      }));
    });
  });

  const update = () => {
    pairs.forEach(p => {
      const cardTop = parseFloat(getComputedStyle(p.card).top) || 0;
      const nextTop = parseFloat(getComputedStyle(p.next).top) || 0;
      const startY = cardTop + p.card.offsetHeight;
      const y = p.next.getBoundingClientRect().top;
      const progress = gsap.utils.clamp(0, 1, (startY - y) / (startY - nextTop || 1));
      p.setScale(1 - progress * (1 - p.scale));
    });
  };

  gsap.ticker.add(update);
  update();

  pageCleanups.push(() => {
    gsap.ticker.remove(update);
    fades.forEach(t => {
      if (t.scrollTrigger) t.scrollTrigger.kill();
      t.kill();
      gsap.set(t.targets(), { clearProps: 'opacity' });
    });
    pairs.forEach(p => gsap.set(p.card, { clearProps: 'transform,top,zIndex,transformOrigin' }));
  });
}
