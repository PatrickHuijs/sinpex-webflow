/*! Sinpex Webflow scripts v1.3.0 | built 2026-10-01 */

/* ===== src/vendor/feedbucket.js ===== */
/*
 * Feedbucket feedback widget loader (was inline in site head).
 */
    (function(k) {
        let s=document.createElement('script');s.defer=true;
        s.src="https://cdn.feedbucket.app/assets/feedbucket.js";
        s.dataset.feedbucket=k;document.head.appendChild(s);
    })('MaDqzUkrhstJI5YriV9R')


/* ===== src/core/gsap-setup.js ===== */
/*
 * Register GSAP plugins and the persistent osmo-ease. Runs once.
 */
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Draggable, InertiaPlugin);
CustomEase.create("osmo-ease", "0.625, 0.05, 0, 1");


/* ===== src/core/cleanup-registry.js ===== */
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


/* ===== src/core/lenis.js ===== */
/*
 * Lenis smooth scroll, initialised once and synced with ScrollTrigger.
 */
const lenis = new Lenis({
  lerp: 0.07,
  smooth: true,
  smoothTouch: false
});

window.lenis = lenis;

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);


/* ===== src/core/barba.js ===== */
/*
 * Barba page transitions and lifecycle hooks.
 *
 * - 'fade-slide-transition' runs between different pages.
 * - 'self' runs when a link points to the page you are already on (e.g. clicking
 *   Solutions on the Solutions page). Without it Barba ignores the click and the
 *   browser does a full reload, which shows as a hard blink.
 * - Same-page anchor links (#section) are left to the browser so they still jump.
 */
function pageLeave(data) {
  return gsap.to(data.current.container, {
    opacity: 0,
    y: -20,
    duration: 0.3
  });
}

function pageEnter(data) {
  lenis.scrollTo(0, { immediate: true });

  // NOTE: nav variant is not set here. The theme-by-section script is the
  // single owner of the variant and runs on beforeEnter, so there is no
  // competing double-set / flicker.

  gsap.from(data.next.container, {
    opacity: 0,
    y: 20,
    duration: 0.4,
    ease: 'power2.out'
  });
}

// True for links to the current page that carry a #hash: let the browser handle those
function isSamePageAnchor(href) {
  if (!href || href.indexOf('#') === -1) return false;
  try {
    var url = new URL(href, window.location.href);
    return url.pathname === window.location.pathname && url.search === window.location.search;
  } catch (e) {
    return false;
  }
}

// A #hash change also fires popstate, which Barba would treat as a same-page
// navigation and run the 'self' transition. Registered before barba.init so it
// runs first and can stop Barba from seeing hash-only changes.
var barbaLastHref = window.location.href;
window.addEventListener('popstate', function (e) {
  var prev = new URL(barbaLastHref);
  var next = new URL(window.location.href);
  barbaLastHref = window.location.href;
  if (prev.pathname === next.pathname && prev.search === next.search && prev.hash !== next.hash) {
    e.stopImmediatePropagation();
  }
});

barba.init({
  prevent: ({ href }) => isSamePageAnchor(href),
  transitions: [
    {
      name: 'fade-slide-transition',
      leave: pageLeave,
      enter: pageEnter
    },
    {
      name: 'self',
      leave: pageLeave,
      enter: pageEnter
    }
  ]
});

// The moment a navigation starts, close the mobile menu smoothly so it
// slides shut in sync with the page leaving instead of snapping.
barba.hooks.beforeLeave(() => {
  if (typeof window.closeNavMenu === 'function') window.closeNavMenu();
});

// Tear down the old page's listeners before the new one initialises,
// and guarantee the menu is fully reset before the new page paints.
barba.hooks.beforeEnter(() => {
  runPageCleanups();
  if (typeof window.resetNavMenu === 'function') window.resetNavMenu();
  if (window.lenis && window.lenis.start) window.lenis.start();
  document.body.style.overflow = '';
});

barba.hooks.after(() => {
  barbaLastHref = window.location.href;
  initPageScripts();
});


/* ===== src/modules/card-stack.js ===== */
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


/* ===== src/modules/metrics-counter.js ===== */
/*
 * Number odometer for metrics. CSS stays in Webflow.
 */
function initNumberOdometer() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const initFlag = 'data-odometer-initialized'
  const activeTweens = new WeakMap()

  const defaults = {
    duration: 1,
    ease: 'power3.out',
    elementStagger: 0.1,
    digitStagger: 0.04,
    revealDuration: 0.5,
    revealEase: 'power2.out',
    triggerStart: 'top 80%',
    staggerOrder: 'left',
    digitCycles: 2
  }

  // Counters without a [data-odometer-group] parent: group per section
  const buckets = new Map()
  document.querySelectorAll('[data-odometer-element]').forEach(el => {
    if (el.closest('[data-odometer-group]')) return
    const key = el.closest('section') || el.parentElement
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(el)
  })
  buckets.forEach(els => {
    let g = els[0].parentElement
    while (!els.every(e => g.contains(e))) g = g.parentElement
    g.setAttribute('data-odometer-group', '')
  })

  // Scroll-triggered groups
  document.querySelectorAll('[data-odometer-group]').forEach(group => {
    if (group.hasAttribute(initFlag)) return
    group.setAttribute(initFlag, '')

    const elements = Array.from(group.querySelectorAll('[data-odometer-element]'))
    if (!elements.length || prefersReducedMotion) return

    const staggerOrder = group.getAttribute('data-odometer-stagger-order') || defaults.staggerOrder
    const triggerStart = group.getAttribute('data-odometer-trigger-start') || defaults.triggerStart
    const elementStagger = parseFloat(group.getAttribute('data-odometer-stagger')) || defaults.elementStagger

    const elementData = elements.map(el => {
      const originalText = el.textContent.trim()
      const hasExplicitStart = el.hasAttribute('data-odometer-start')
      const startValue = parseFloat(el.getAttribute('data-odometer-start')) || 0
      const duration = parseFloat(el.getAttribute('data-odometer-duration')) || defaults.duration
      const step = getLineHeightRatio(el)

      let segments = parseSegments(originalText)
      segments = mapStartDigits(segments, startValue)
      segments = markHiddenSegments(segments, startValue)

      const grow = shouldGrow(el, hasExplicitStart, startValue, segments)
      const { rollers, revealEls } = buildRollerDOM(el, segments, step, grow)

      const fontSize = parseFloat(getComputedStyle(el).fontSize)
      const revealData = revealEls.map(revealEl => {
        const widthEm = revealEl.offsetWidth / fontSize
        gsap.set(revealEl, { width: 0, overflow: 'hidden' })
        return { el: revealEl, widthEm }
      })

      return { el, rollers, duration, step, revealData, originalText }
    })

    const ordered = applyStaggerOrder(elementData, staggerOrder)

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: group,
        start: triggerStart,
        once: true
      },
      onComplete() {
        elementData.forEach(({ el, originalText, step }) => {
          cleanupElement(el, originalText)
        })
      }
    })

    ordered.forEach((data, orderIdx) => {
      const { rollers, duration, step, revealData } = data
      const offset = orderIdx * elementStagger

      revealData.forEach(({ el, widthEm }) => {
        tl.to(el, {
          width: widthEm + 'em',
          opacity: 1,
          duration: defaults.revealDuration,
          ease: defaults.revealEase
        }, offset)
      })

      rollers.forEach(({ roller, targetPos }, digitIdx) => {
        const reversedIdx = rollers.length - 1 - digitIdx
        tl.to(roller, {
          y: -targetPos * step + 'em',
          duration,
          ease: defaults.ease,
          force3D: true
        }, offset + reversedIdx * defaults.digitStagger)
      })
    })
  })

  // Programmatic update (optional add-on)
  return function updateOdometer(el, newText, options = {}) {
    const currentText = el.textContent.trim()
    if (currentText === newText) return

    const duration = options.duration || defaults.duration
    const ease = options.ease || defaults.ease
    const step = getLineHeightRatio(el)

    // Kill any running animation and clear its inline style locks
    const existing = activeTweens.get(el)
    if (existing) {
      existing.kill()
      gsap.set(el, { clearProps: 'width,overflow' })
    }

    // Measure current width before rebuilding (in em for responsive scaling)
    const fontSize = parseFloat(getComputedStyle(el).fontSize)
    const oldWidthEm = el.getBoundingClientRect().width / fontSize

    // Parse current text as start, new text as end
    const startSegments = parseSegments(currentText)
    const startDigitsStr = startSegments
      .filter(s => s.type === 'digit')
      .map(s => s.char)
      .join('')
    const startValue = parseInt(startDigitsStr, 10) || 0

    let segments = parseSegments(newText)
    segments = mapStartDigits(segments, startValue)
    segments = markHiddenSegments(segments, startValue)
    const { rollers, revealEls } = buildRollerDOM(el, segments, step, true)

    // Measure new natural width (in em)
    const newWidthEm = el.getBoundingClientRect().width / fontSize
    const widthChanged = Math.abs(oldWidthEm - newWidthEm) > 0.01

    // Lock to old width for smooth transition
    if (widthChanged) {
      gsap.set(el, { width: oldWidthEm + 'em', overflow: 'hidden' })
    }

    const tl = gsap.timeline({
      onComplete() {
        cleanupElement(el, newText)
        activeTweens.delete(el)
      }
    })
    activeTweens.set(el, tl)

    // Animate element width
    if (widthChanged) {
      tl.to(el, {
        width: newWidthEm + 'em',
        duration: defaults.revealDuration,
        ease: defaults.revealEase
      }, 0)
    }

    // Fade in hidden statics
    revealEls.forEach(revealEl => {
      if (revealEl.getAttribute('data-odometer-part') === 'static') {
        tl.to(revealEl, { opacity: 1, duration: 0.2 }, 0)
      }
    })

    // Roll digits
    rollers.forEach(({ roller, targetPos }, digitIdx) => {
      const reversedIdx = rollers.length - 1 - digitIdx
      tl.to(roller, {
        y: -targetPos * step + 'em',
        duration,
        ease,
        force3D: true
      }, reversedIdx * defaults.digitStagger)
    })
  }

  // Helpers
  function getLineHeightRatio(el) {
    const cs = getComputedStyle(el)
    const lh = cs.lineHeight
    if (lh === 'normal') return 1.2
    return parseFloat(lh) / parseFloat(cs.fontSize)
  }

  function parseSegments(text) {
    return [...text].map(char => ({
      type: /\d/.test(char) ? 'digit' : 'static',
      char
    }))
  }

  function mapStartDigits(segments, startValue) {
    const digitSlots = segments.filter(s => s.type === 'digit')
    const padded = String(Math.floor(Math.abs(startValue)))
      .padStart(digitSlots.length, '0')
      .slice(-digitSlots.length)
    let di = 0
    return segments.map(s =>
      s.type === 'digit'
        ? { ...s, startDigit: parseInt(padded[di++], 10) }
        : s
    )
  }

  function markHiddenSegments(segments, startValue) {
    const totalDigits = segments.filter(s => s.type === 'digit').length
    const absStart = Math.floor(Math.abs(startValue))
    const startDigitCount = absStart === 0 ? 1 : String(absStart).length
    const leadingZeros = Math.max(0, totalDigits - startDigitCount)
    if (leadingZeros === 0) return segments
    let digitsSeen = 0
    let firstDigitSeen = false
    let prevDigitHidden = false
    return segments.map(seg => {
      if (seg.type === 'digit') {
        firstDigitSeen = true
        const hidden = digitsSeen < leadingZeros
        prevDigitHidden = hidden
        digitsSeen++
        return { ...seg, hidden }
      }
      const hidden = firstDigitSeen && prevDigitHidden
      return { ...seg, hidden }
    })
  }

  function shouldGrow(el, hasExplicitStart, startValue, segments) {
    if (el.hasAttribute('data-odometer-grow')) {
      return el.getAttribute('data-odometer-grow') !== 'false'
    }
    if (!hasExplicitStart) return false
    const absStart = Math.floor(Math.abs(startValue))
    const startDigitCount = absStart === 0 ? 1 : String(absStart).length
    const endDigitCount = segments.filter(s => s.type === 'digit').length
    return startDigitCount < endDigitCount
  }

  function buildRollerDOM(el, segments, step, grow) {
    el.innerHTML = ''
    el.style.height = ''
    const rollers = []
    const revealEls = []
    const totalCells = 10 * defaults.digitCycles
    segments.forEach(seg => {
      if (seg.type === 'static') {
        const span = document.createElement('span')
        span.setAttribute('data-odometer-part', 'static')
        span.style.height = step + 'em'
        span.style.lineHeight = step
        span.textContent = seg.char
        el.appendChild(span)
        if (grow && seg.hidden) {
          gsap.set(span, { opacity: 0 })
          revealEls.push(span)
        }
        return
      }
      const mask = document.createElement('span')
      mask.setAttribute('data-odometer-part', 'mask')
      mask.style.height = step + 'em'
      mask.style.lineHeight = step
      const roller = document.createElement('span')
      roller.setAttribute('data-odometer-part', 'roller')
      roller.style.lineHeight = step

      const digits = []
      for (let d = 0; d < totalCells; d++) {
        digits.push(d % 10)
      }
      roller.textContent = digits.join('\n')
      mask.appendChild(roller)
      el.appendChild(mask)
      const startDigit = seg.startDigit || 0
      const isReveal = grow && seg.hidden
      gsap.set(roller, { y: isReveal ? step + 'em' : -startDigit * step + 'em' })
      const endDigit = parseInt(seg.char, 10)
      const targetPos = endDigit > startDigit ? endDigit : 10 + endDigit
      rollers.push({ roller, targetPos })
      if (isReveal) revealEls.push(mask)
    })
    return { rollers, revealEls }
  }

  function cleanupElement(el, originalText) {
    el.style.overflow = ''
    el.style.height = ''

    // Remove rollers, set final digit, clear inline bloat (but preserve width)
    const digits = [...originalText].filter(c => /\d/.test(c))
    let di = 0

    el.querySelectorAll('[data-odometer-part="mask"]').forEach(mask => {
      const roller = mask.querySelector('[data-odometer-part="roller"]')
      if (roller) roller.remove()
      mask.textContent = digits[di++] || ''
      mask.style.opacity = ''
      mask.style.overflow = ''
    })

    el.querySelectorAll('[data-odometer-part="static"]').forEach(stat => {
      stat.style.opacity = ''
    })
  }

  function recalcOnResize() {
    document.querySelectorAll('[data-odometer-element]').forEach(el => {
      const running = activeTweens.get(el)
      if (running) {
        running.progress(1)
        activeTweens.delete(el)
      }

      const hasRollers = el.querySelector('[data-odometer-part="roller"]')

      if (hasRollers) {
        // Pre-triggered: recalculate step-based inline styles
        const step = getLineHeightRatio(el)
        el.querySelectorAll('[data-odometer-part="mask"]').forEach(mask => {
          mask.style.height = step + 'em'
          mask.style.lineHeight = step
        })
        el.querySelectorAll('[data-odometer-part="roller"]').forEach(roller => {
          roller.style.lineHeight = step
        })
        el.querySelectorAll('[data-odometer-part="static"]').forEach(stat => {
          stat.style.lineHeight = step
        })
      }
      // Completed elements: width is em-based, scales automatically, don't touch
    })
    ScrollTrigger.refresh()
  }

  // Resize listener, registered with the cleanup registry so Barba
  // page transitions don't stack up extra listeners.
  let resizeTimer
  let lastWidth = window.innerWidth
  const onResize = () => {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (window.innerWidth === lastWidth) return
      lastWidth = window.innerWidth
      recalcOnResize()
    }, 250)
  }
  window.addEventListener('resize', onResize)
  pageCleanups.push(() => {
    clearTimeout(resizeTimer)
    window.removeEventListener('resize', onResize)
  })

  function applyStaggerOrder(items, order) {
    const arr = [...items]
    if (order === 'right') return arr.reverse()
    if (order === 'random') return shuffleArray(arr)
    return arr
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
}


/* ===== src/modules/text-split.js ===== */
/*
 * Masked text reveal on scroll (SplitText).
 */
const splitConfig = {
  lines: { duration: 0.8, stagger: 0.08 },
  words: { duration: 0.6, stagger: 0.06 },
  chars: { duration: 0.4, stagger: 0.01 }
};

function initMaskTextScrollReveal() {
  document.querySelectorAll('[data-split="heading"]').forEach((heading) => {
    gsap.set(heading, { autoAlpha: 1 });

    const type = heading.dataset.splitReveal || "lines";
    const typesToSplit =
      type === "lines" ? ["lines"] :
      type === "words" ? ["lines", "words"] : ["lines", "words", "chars"];

    const instance = SplitText.create(heading, {
      type: typesToSplit.join(", "),
      mask: "lines",
      autoSplit: true,
      linesClass: "line",
      wordsClass: "word",
      charsClass: "letter",
      onSplit: function (self) {
        const targets = self[type];
        const config = splitConfig[type];

        const rect = heading.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight * 0.8;

        return gsap.from(targets, {
          yPercent: 110,
          duration: config.duration,
          stagger: config.stagger,
          ease: "expo.out",
          scrollTrigger: isInViewport ? undefined : {
            trigger: heading,
            start: "clamp(top 80%)",
            once: true
          },
          delay: isInViewport ? 0.1 : 0
        });
      }
    });

    pageCleanups.push(() => { try { instance.revert(); } catch (e) {} });
  });
}


/* ===== src/modules/nav-menu.js ===== */
/*
 * Nav: mobile menu and scroll background.
 */
function initNav() {
  var nav = document.querySelector('.nav_component');
  if (!nav || nav.dataset.navInit) return;
  nav.dataset.navInit = '1';

  if (!document.getElementById('nav-scroll-css')) {
    var s = document.createElement('style');
    s.id = 'nav-scroll-css';
    s.textContent =
      '.navbar{transition:background-color .3s ease,backdrop-filter .3s ease,-webkit-backdrop-filter .3s ease,margin .3s ease}' +
      '.nav_component .navbar{background-color:rgba(255,255,255,.1);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
      '.nav_component[data-wf--nav--variant="dark-mode"] .navbar{background-color:transparent;backdrop-filter:none;-webkit-backdrop-filter:none}' +
      '.nav_component[data-wf--nav--variant="dark-mode"][data-nav-scrolled="true"] .navbar{background-color:rgba(3,11,18,.05);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
      '.nav_menu_link{display:inline-block}' +          /* lets the links transform (slide) */
      '.nav_menu_actions>*{width:100%}';
    document.head.appendChild(s);
  }

  var onScroll = function () {
    var y = window.lenis ? window.lenis.scroll : window.scrollY;
    nav.setAttribute('data-nav-scrolled', y > 40 ? 'true' : 'false');
  };
  onScroll();
  if (window.lenis && window.lenis.on) window.lenis.on('scroll', onScroll);
  else window.addEventListener('scroll', onScroll, { passive: true });

  var menu  = nav.querySelector('.nav_menu'),
      ov    = nav.querySelector('.nav_overlay'),
      trg   = nav.querySelector('.nav_trigger'),
      links = nav.querySelectorAll('.nav_menu_link');
  if (!menu || typeof gsap === 'undefined') return;

  var open = false;

  /* ============ TWEAK THE ANIMATION HERE ============ */
  var closeSpeed = 1.3; // higher = closes faster

  // Panel + scrim (reverses instantly on close)
  var tl = gsap.timeline({ paused: true, onReverseComplete: function () { menu.style.visibility = 'hidden'; } });
  tl.set(menu, { visibility: 'visible', x: 0, xPercent: 100 }, 0)
    .to(ov,   { opacity: 0.6, duration: 0.5, ease: 'power2.out' }, 0)          // scrim dim
    .to(menu, { x: 0, xPercent: 0, duration: 0.7, ease: 'power3.out' }, 0);    // panel slide-in

  // Links slide in from the left (open only, so close isn't delayed)
  function animateLinksIn() {
    gsap.fromTo(links,
      { x: -48, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.6, stagger: 0.09, ease: 'power3.out', delay: 0.25, overwrite: true });
  }
  /* ================================================== */

  function openMenu() {
    if (open) return;
    open = true;
    nav.setAttribute('data-menu-open', '1');
    ov.style.pointerEvents = 'auto';
    if (window.lenis && window.lenis.stop) window.lenis.stop();
    document.body.style.overflow = 'hidden';
    tl.timeScale(1).play();
    animateLinksIn();
  }

  // instant = true snaps the panel shut with no animation (used as a
  // guaranteed reset when a new page is entering).
  function closeMenu(instant) {
    if (!open && !instant) return;
    open = false;
    nav.setAttribute('data-menu-open', '0');
    if (ov) ov.style.pointerEvents = 'none';
    if (window.lenis && window.lenis.start) window.lenis.start();
    document.body.style.overflow = '';

    if (instant) {
      gsap.killTweensOf(links);
      gsap.set(links, { autoAlpha: 0 });
      tl.pause().progress(0);
      menu.style.visibility = 'hidden';
      return;
    }

    gsap.to(links, { autoAlpha: 0, duration: 0.2, overwrite: true });
    tl.timeScale(closeSpeed).reverse();
  }

  // Expose for Barba: smooth close on leave, hard reset on enter.
  window.closeNavMenu = function () { closeMenu(false); };
  window.resetNavMenu = function () { closeMenu(true); };

  if (trg) trg.addEventListener('click', function () { open ? closeMenu() : openMenu(); });
  if (ov) ov.addEventListener('click', function () { closeMenu(); });
  links.forEach(function (l) { l.addEventListener('click', function () { closeMenu(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
}

if (document.readyState !== 'loading') initNav();
else document.addEventListener('DOMContentLoaded', initNav);


/* ===== src/modules/nav-theme.js ===== */
/*
 * Nav: base/dark theme switch by section on scroll.
 */
(function () {
  var DARK = 'dark-mode',
      VARIANT_CLASS = 'w-variant-e6ad70a9-35a7-3757-addd-ca744bb9940d'; // Nav "Dark mode" variant
  var nav = null, sections = [], last = null, line = 60;

  function css() {
    if (document.getElementById('nav-theme-css')) return;
    var s = document.createElement('style');
    s.id = 'nav-theme-css';
    s.textContent =
      '.navbar_container{transition:color .3s ease}' +
      '.navbar_logo-svg path{transition:fill .3s ease}' +
      // while the menu is open, force logo + hamburger dark so they read on the white panel
      '.nav_component[data-menu-open="1"] .navbar{background-color:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}' +
      '.nav_component[data-menu-open="1"] .navbar_container{color:var(--_swatches---swatch--030b12-100)!important}';
    document.head.appendChild(s);
  }

  function scan() {
    nav = document.querySelector('.nav_component');
    sections = [];
    var scope = document.querySelector('[data-barba="container"]') || document.body,
        all = scope.getElementsByTagName('section');
    for (var i = 0; i < all.length; i++) {
      var el = all[i], attrs = el.attributes;
      for (var j = 0; j < attrs.length; j++) {
        var n = attrs[j].name;
        if (n.indexOf('data-wf--section') === 0 && n.slice(-9) === '--variant') {
          sections.push({ el: el, dark: /dark/i.test(attrs[j].value) });
          break;
        }
      }
    }
  }

  function measure() {
    var bar = nav && nav.querySelector('.navbar');
    line = bar ? bar.getBoundingClientRect().top + bar.offsetHeight / 2 : 60; // switch line = navbar centre
  }

  function update() {
    if (!nav) return;
    var dark = false;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].el.getBoundingClientRect();
      if (r.top <= line && r.bottom > line) dark = sections[i].dark;
    }
    if (dark === last) return;
    last = dark;
    nav.setAttribute('data-wf--nav--variant', dark ? DARK : 'default');
    nav.classList.toggle(VARIANT_CLASS, dark);
  }

  function init() { last = null; css(); scan(); measure(); update(); }

  function boot() {
    if (window.lenis && window.lenis.on) window.lenis.on('scroll', update);
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { measure(); update(); });
    // Set the correct variant BEFORE the new page fades in (single owner,
    // no 50ms-late second switch), which is what was causing the flicker.
    if (window.barba && window.barba.hooks) window.barba.hooks.beforeEnter(function () { init(); });
    init();
  }

  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();


/* ===== src/modules/button-icon-recolour.js ===== */
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


/* ===== src/modules/swiper-a11y.js ===== */
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


/* ===== src/modules/logo-marquee.js ===== */
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


/* ===== src/modules/centered-slider.js ===== */
/*
 * Centered testimonial slider (Section / Proof slider).
 */
function initSliders() {
  const sliderWrappers = gsap.utils.toArray(document.querySelectorAll('[data-centered-slider="wrapper"]'));

  sliderWrappers.forEach((sliderWrapper) => {
    const slides = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="slide"]'));
    const bullets = gsap.utils.toArray(sliderWrapper.querySelectorAll('[data-centered-slider="bullet"]'));
    const prevButton = sliderWrapper.querySelector('[data-centered-slider="prev-button"]');
    const nextButton = sliderWrapper.querySelector('[data-centered-slider="next-button"]');

    let activeElement;
    let activeBullet;
    let currentIndex = 0;
    let autoplay;

    const autoplayEnabled = sliderWrapper.getAttribute('data-slider-autoplay') === 'true';
    const autoplayDuration = autoplayEnabled ? parseFloat(sliderWrapper.getAttribute('data-slider-autoplay-duration')) || 0 : 0;

    slides.forEach((slide, i) => {
      slide.setAttribute("id", `slide-${i}`);
    });

    if (bullets && bullets.length > 0) {
      bullets.forEach((bullet, i) => {
        bullet.setAttribute("aria-controls", `slide-${i}`);
        bullet.setAttribute("aria-selected", i === currentIndex ? "true" : "false");
      });
    }

    const loop = horizontalLoop(slides, {
      paused: true,
      draggable: true,
      center: true,
      onChange: (element, index) => {
        currentIndex = index;

        if (activeElement) activeElement.classList.remove("active");
        element.classList.add("active");
        activeElement = element;

        if (bullets && bullets.length > 0) {
          if (activeBullet) activeBullet.classList.remove("active");
          if (bullets[index]) {
            bullets[index].classList.add("active");
            activeBullet = bullets[index];
          }
          bullets.forEach((bullet, i) => {
            bullet.setAttribute("aria-selected", i === index ? "true" : "false");
          });
        }
      }
    });

    loop.toIndex(2, { duration: 0.01 });

    function startAutoplay() {
      if (autoplayDuration > 0 && !autoplay) {
        const repeat = () => {
          loop.next({ ease: "osmo-ease", duration: 0.725 });
          autoplay = gsap.delayedCall(autoplayDuration, repeat);
        };
        autoplay = gsap.delayedCall(autoplayDuration, repeat);
      }
    }

    function stopAutoplay() {
      if (autoplay) {
        autoplay.kill();
        autoplay = null;
      }
    }

    const st = ScrollTrigger.create({
      trigger: sliderWrapper,
      start: "top bottom",
      end: "bottom top",
      onEnter: startAutoplay,
      onLeave: stopAutoplay,
      onEnterBack: startAutoplay,
      onLeaveBack: stopAutoplay
    });

    sliderWrapper.addEventListener("mouseenter", stopAutoplay);
    sliderWrapper.addEventListener("mouseleave", () => {
      if (ScrollTrigger.isInViewport(sliderWrapper)) startAutoplay();
    });

    slides.forEach((slide, i) => {
      slide.addEventListener("click", () => {
        loop.toIndex(i, { ease: "osmo-ease", duration: 0.725 });
      });
    });

    if (bullets && bullets.length > 0) {
      bullets.forEach((bullet, i) => {
        bullet.addEventListener("click", () => {
          loop.toIndex(i, { ease: "osmo-ease", duration: 0.725 });
          if (activeBullet) activeBullet.classList.remove("active");
          bullet.classList.add("active");
          activeBullet = bullet;
          bullets.forEach((b, j) => {
            b.setAttribute("aria-selected", j === i ? "true" : "false");
          });
        });
      });
    }

    if (prevButton) {
      prevButton.addEventListener("click", () => {
        let newIndex = currentIndex - 1;
        if (newIndex < 0) newIndex = slides.length - 1;
        loop.toIndex(newIndex, { ease: "osmo-ease", duration: 0.725 });
      });
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => {
        let newIndex = currentIndex + 1;
        if (newIndex >= slides.length) newIndex = 0;
        loop.toIndex(newIndex, { ease: "osmo-ease", duration: 0.725 });
      });
    }

    // Teardown: stop autoplay, remove the window resize listener the loop
    // added, kill its draggable and timeline.
    pageCleanups.push(() => {
      stopAutoplay();
      if (typeof loop.removeResize === "function") loop.removeResize();
      if (loop.draggable) loop.draggable.kill();
      st.kill();
      loop.kill();
    });
  });
}

// GSAP Helper function to create a looping slider
// Read more: https://gsap.com/docs/v3/HelperFunctions/helpers/seamlessLoop
function horizontalLoop(items, config) {
  let timeline;
  items = gsap.utils.toArray(items);
  config = config || {};
  gsap.context(() => {
    let onChange = config.onChange,
      lastIndex = 0,
      tl = gsap.timeline({
        repeat: config.repeat,
        onUpdate: onChange && function () {
          let i = tl.closestIndex();
          if (lastIndex !== i) {
            lastIndex = i;
            onChange(items[i], i);
          }
        },
        paused: config.paused,
        defaults: { ease: "none" },
        onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)
      }),
      length = items.length,
      startX = items[0].offsetLeft,
      times = [],
      widths = [],
      spaceBefore = [],
      xPercents = [],
      curIndex = 0,
      indexIsDirty = false,
      center = config.center,
      pixelsPerSecond = (config.speed || 1) * 100,
      snap = config.snap === false ? v => v : gsap.utils.snap(config.snap || 1),
      timeOffset = 0,
      container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
      totalWidth,
      getTotalWidth = () => items[length - 1].offsetLeft + xPercents[length - 1] / 100 * widths[length - 1] - startX + spaceBefore[0] + items[length - 1].offsetWidth * gsap.getProperty(items[length - 1], "scaleX") + (parseFloat(config.paddingRight) || 0),
      populateWidths = () => {
        let b1 = container.getBoundingClientRect(),
          b2;
        items.forEach((el, i) => {
          widths[i] = parseFloat(gsap.getProperty(el, "width", "px"));
          xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px")) / widths[i] * 100 + gsap.getProperty(el, "xPercent"));
          b2 = el.getBoundingClientRect();
          spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
          b1 = b2;
        });
        gsap.set(items, {
          xPercent: i => xPercents[i]
        });
        totalWidth = getTotalWidth();
      },
      timeWrap,
      populateOffsets = () => {
        timeOffset = center ? tl.duration() * (container.offsetWidth / 2) / totalWidth : 0;
        center && times.forEach((t, i) => {
          times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 / totalWidth - timeOffset);
        });
      },
      getClosest = (values, value, wrap) => {
        let i = values.length,
          closest = 1e10,
          index = 0,
          d;
        while (i--) {
          d = Math.abs(values[i] - value);
          if (d > wrap / 2) {
            d = wrap - d;
          }
          if (d < closest) {
            closest = d;
            index = i;
          }
        }
        return index;
      },
      populateTimeline = () => {
        let i, item, curX, distanceToStart, distanceToLoop;
        tl.clear();
        for (i = 0; i < length; i++) {
          item = items[i];
          curX = xPercents[i] / 100 * widths[i];
          distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
          distanceToLoop = distanceToStart + widths[i] * gsap.getProperty(item, "scaleX");
          tl.to(item, {
              xPercent: snap((curX - distanceToLoop) / widths[i] * 100),
              duration: distanceToLoop / pixelsPerSecond
            }, 0)
            .fromTo(item, {
                xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)
              }, {
                xPercent: xPercents[i],
                duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
                immediateRender: false
              },
              distanceToLoop / pixelsPerSecond)
            .add("label" + i, distanceToStart / pixelsPerSecond);
          times[i] = distanceToStart / pixelsPerSecond;
        }
        timeWrap = gsap.utils.wrap(0, tl.duration());
      },
      refresh = (deep) => {
        let progress = tl.progress();
        tl.progress(0, true);
        populateWidths();
        deep && populateTimeline();
        populateOffsets();
        deep && tl.draggable ? tl.time(times[curIndex], true) : tl.progress(progress, true);
      },
      onResize = () => refresh(true),
      proxy;
    gsap.set(items, { x: 0 });
    populateWidths();
    populateTimeline();
    populateOffsets();
    window.addEventListener("resize", onResize);

    function toIndex(index, vars) {
      vars = vars || {};
      (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length);
      let newIndex = gsap.utils.wrap(0, length, index),
        time = times[newIndex];
      if (time > tl.time() !== index > curIndex && index !== curIndex) {
        time += tl.duration() * (index > curIndex ? 1 : -1);
      }
      if (time < 0 || time > tl.duration()) {
        vars.modifiers = { time: timeWrap };
      }
      curIndex = newIndex;
      vars.overwrite = true;
      gsap.killTweensOf(proxy);
      return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
    }
    tl.toIndex = (index, vars) => toIndex(index, vars);
    tl.closestIndex = setCurrent => {
      let index = getClosest(times, tl.time(), tl.duration());
      if (setCurrent) {
        curIndex = index;
        indexIsDirty = false;
      }
      return index;
    };
    tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
    tl.next = vars => toIndex(tl.current() + 1, vars);
    tl.previous = vars => toIndex(tl.current() - 1, vars);
    tl.times = times;
    tl.progress(1, true).progress(0, true);
    if (config.reversed) {
      tl.vars.onReverseComplete();
      tl.reverse();
    }
    if (config.draggable && typeof (Draggable) === "function") {
      proxy = document.createElement("div");
      let wrap = gsap.utils.wrap(0, 1),
        ratio, startProgress, draggable, dragSnap, lastSnap, initChangeX, wasPlaying,
        align = () => tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio)),
        syncIndex = () => tl.closestIndex(true);
      typeof (InertiaPlugin) === "undefined" && console.warn("InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club");
      draggable = Draggable.create(proxy, {
        trigger: items[0].parentNode,
        type: "x",
        onPressInit() {
          let x = this.x;
          gsap.killTweensOf(tl);
          wasPlaying = !tl.paused();
          tl.pause();
          startProgress = tl.progress();
          refresh();
          ratio = 1 / totalWidth;
          initChangeX = (startProgress / -ratio) - x;
          gsap.set(proxy, { x: startProgress / -ratio });
        },
        onDrag: align,
        onThrowUpdate: align,
        overshootTolerance: 0,
        inertia: true,
        snap(value) {
          if (Math.abs(startProgress / -ratio - this.x) < 10) {
            return lastSnap + initChangeX;
          }
          let time = -(value * ratio) * tl.duration(),
            wrappedTime = timeWrap(time),
            snapTime = times[getClosest(times, wrappedTime, tl.duration())],
            dif = snapTime - wrappedTime;
          Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
          lastSnap = (time + dif) / tl.duration() / -ratio;
          return lastSnap;
        },
        onRelease() {
          syncIndex();
          draggable.isThrowing && (indexIsDirty = true);
        },
        onThrowComplete: () => {
          syncIndex();
          wasPlaying && tl.play();
        }
      })[0];
      tl.draggable = draggable;
    }
    tl.closestIndex(true);
    lastIndex = curIndex;
    onChange && onChange(items[curIndex], curIndex);
    timeline = tl;
    // Expose the resize cleanup so teardown can remove the window listener.
    tl.removeResize = () => window.removeEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });
  return timeline;
}


/* ===== src/modules/hero-image-scale.js ===== */
/*
 * Hero image scale on scroll.
 */
function initHeroImageScale() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.querySelectorAll("[data-wf--section-hero-full-image--variant]").forEach((section) => {
    const bg = section.querySelector(".section_bg");
    const img = section.querySelector(".section_bg .img-abs");
    if (!bg || !img) return;

    gsap.set(bg, { overflow: "hidden" });
    gsap.set(img, { transformOrigin: "50% 50%", willChange: "transform" });

    gsap.fromTo(img, { scale: 1 }, {
      scale: 1.15,
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom top",
        scrub: true
      }
    });
  });
}


/* ===== src/modules/cards-stagger.js ===== */
/*
 * Cards stagger in on scroll.
 */
function initCardsStagger() {
  gsap.utils.toArray("[data-scroll-stagger=wrapper]").forEach(wrapper => {
    gsap.fromTo(
      wrapper.querySelectorAll("[data-scroll-stagger=item]"),
      { y: "15%", opacity: 0 },
      {
        y: "0%",
        opacity: 1,
        stagger: 0.1,
        scrollTrigger: {
          trigger: wrapper,
          start: "top bottom",
          end: "top center",
          scrub: false,
        },
      }
    );
  });
}


/* ===== src/modules/fade-in-reveal.js ===== */
/*
 * Fade-in reveal on scroll.
 */
function initFadeInReveal() {
  gsap.utils.toArray("[data-scroll-fade]").forEach(el => {
    gsap.fromTo(
      el, { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 1.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 80%",
          toggleActions: "play none none none"
        }
      }
    );
  });
}


/* ===== src/modules/divider-grow.js ===== */
/*
 * Divider grow reveal on scroll.
 */
function initDividerGrowReveal() {
  gsap.utils.toArray(".divider-horizontal").forEach(divider => {
    gsap.fromTo(
      divider, { width: "0%" },
      {
        width: "100%",
        duration: 1.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: divider,
          start: "top 90%",
          toggleActions: "play none none reverse"
        }
      }
    );
  });
}


/* ===== src/modules/parallax-images.js ===== */
/*
 * Parallax images.
 */
function initParallaxImages() {
  gsap.utils.toArray('[data-img-parallax="trigger"][data-animation="true"]').forEach(trigger => {
    const target = trigger.querySelector('[data-img-parallax="target"]');
    if (!target) return;

    const strength = parseFloat(trigger.getAttribute('data-parallax')) || 5;
    const dir = trigger.getAttribute('data-direction') === 'reverse' ? -1 : 1;

    gsap.fromTo(
      target, { y: `${strength * dir}%` },
      {
        y: `${-strength * dir}%`,
        ease: 'none',
        scrollTrigger: {
          trigger,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true
        }
      }
    );
  });
}


/* ===== src/modules/back-to-top.js ===== */
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


/* ===== src/modules/logo-wall-cycle.js ===== */
/*
 * Logo wall cycle.
 */
function initLogoWallCycle() {
  const loopDelay = 1.5;   // Loop Duration
  const duration  = 0.9;   // Animation Duration

  document.querySelectorAll('[data-logo-wall-cycle-init]').forEach(root => {
    const list   = root.querySelector('[data-logo-wall-list]');
    const items  = Array.from(list.querySelectorAll('[data-logo-wall-item]'));

    const shuffleFront = root.getAttribute('data-logo-wall-shuffle') !== 'false';
    const originalTargets = items
      .map(item => item.querySelector('[data-logo-wall-target]'))
      .filter(Boolean);

    let visibleItems   = [];
    let visibleCount   = 0;
    let pool           = [];
    let pattern        = [];
    let patternIndex   = 0;
    let tl;

    function isVisible(el) {
      return window.getComputedStyle(el).display !== 'none';
    }

    function shuffleArray(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function setup() {
      if (tl) {
        tl.kill();
      }
      visibleItems = items.filter(isVisible);
      visibleCount = visibleItems.length;

      pattern = shuffleArray(
        Array.from({ length: visibleCount }, (_, i) => i)
      );
      patternIndex = 0;

      // remove all injected targets
      items.forEach(item => {
        item.querySelectorAll('[data-logo-wall-target]').forEach(old => old.remove());
      });

      pool = originalTargets.map(n => n.cloneNode(true));

      let front, rest;
      if (shuffleFront) {
        const shuffledAll = shuffleArray(pool);
        front = shuffledAll.slice(0, visibleCount);
        rest  = shuffleArray(shuffledAll.slice(visibleCount));
      } else {
        front = pool.slice(0, visibleCount);
        rest  = shuffleArray(pool.slice(visibleCount));
      }
      pool = front.concat(rest);

      for (let i = 0; i < visibleCount; i++) {
        const parent =
          visibleItems[i].querySelector('[data-logo-wall-target-parent]') ||
          visibleItems[i];
        parent.appendChild(pool.shift());
      }

      tl = gsap.timeline({ repeat: -1, repeatDelay: loopDelay });
      tl.call(swapNext);
      tl.play();
    }

    function swapNext() {
      const nowCount = items.filter(isVisible).length;
      if (nowCount !== visibleCount) {
        setup();
        return;
      }
      if (!pool.length) return;

      const idx = pattern[patternIndex % visibleCount];
      patternIndex++;

      const container = visibleItems[idx];
      const parent =
        container.querySelector('[data-logo-wall-target-parent]') ||
        container.querySelector('*:has(> [data-logo-wall-target])') ||
        container;
      const existing = parent.querySelectorAll('[data-logo-wall-target]');
      if (existing.length > 1) return;

      const current  = parent.querySelector('[data-logo-wall-target]');
      const incoming = pool.shift();

      gsap.set(incoming, { yPercent: 50, autoAlpha: 0 });
      parent.appendChild(incoming);

      if (current) {
        gsap.to(current, {
          yPercent: -50,
          autoAlpha: 0,
          duration,
          ease: "expo.inOut",
          onComplete: () => {
            current.remove();
            pool.push(current);
          }
        });
      }

      gsap.to(incoming, {
        yPercent: 0,
        autoAlpha: 1,
        duration,
        delay: 0.1,
        ease: "expo.inOut"
      });
    }

    setup();

    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'bottom top',
      onEnter:     () => tl.play(),
      onLeave:     () => tl.pause(),
      onEnterBack: () => tl.play(),
      onLeaveBack: () => tl.pause()
    });

    const onVisibility = () => document.hidden ? tl.pause() : tl.play();
    document.addEventListener('visibilitychange', onVisibility);

    // Teardown: kill the repeating timeline + trigger, drop the doc listener.
    pageCleanups.push(() => {
      if (tl) tl.kill();
      st.kill();
      document.removeEventListener('visibilitychange', onVisibility);
    });
  });
}


/* ===== src/modules/slider-video-lightbox.js ===== */
/*
 * Slider video preview + Osmo Bunny lightbox (MP4). CSS stays in Webflow site head.
 */
(function () {
  var cleanups = [];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var OPEN_ATTR = 'data-bunny-lightbox-open';

  function onEvt(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanups.push(function () { target.removeEventListener(type, fn, opts); });
  }
  function lightboxIsOpen() { return document.documentElement.hasAttribute(OPEN_ATTR); }
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ---------- Preview loops: only the active slide plays, only while in view ---------- */
  function initSliderVideos() {
    document.querySelectorAll('[data-centered-slider="wrapper"]').forEach(function (wrapper) {
      var items = [];

      wrapper.querySelectorAll('[data-centered-slider="slide"]').forEach(function (slide) {
        var btn = slide.querySelector('[data-bunny-lightbox-control="open"]');
        if (btn && !(btn.getAttribute('data-bunny-lightbox-src') || '').trim()) btn.style.display = 'none';

        var holder = slide.querySelector('[data-slider-video-src]');
        if (!holder) return;
        var src = (holder.getAttribute('data-slider-video-src') || '').trim();
        if (!src) { holder.style.display = 'none'; return; }
        items.push({ slide: slide, holder: holder, src: src, video: null });
      });
      if (!items.length) return;

      var inView = false;
      var raf = null;

      function createVideo(item, preload) {
        if (item.video) return item.video;
        var v = document.createElement('video');
        v.className = 'testimonial-card_video-el';
        v.muted = true;
        v.defaultMuted = true;
        v.loop = true;
        v.playsInline = true;
        v.setAttribute('muted', '');
        v.setAttribute('loop', '');
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        v.setAttribute('disablepictureinpicture', '');
        v.setAttribute('aria-hidden', 'true');
        v.setAttribute('tabindex', '-1');
        v.preload = preload;
        v.addEventListener('playing', function () { item.holder.classList.add('is-playing'); });
        v.src = item.src;
        item.holder.appendChild(v);
        item.video = v;
        return v;
      }

      function update() {
        raf = null;
        var allowed = inView && !document.hidden && !lightboxIsOpen() && !reduceMotion.matches;
        items.forEach(function (item, i) {
          var active = item.slide.classList.contains('active');
          if (allowed && active) {
            var v = createVideo(item, 'auto');
            if (v.preload !== 'auto') v.preload = 'auto';
            if (v.paused) {
              var p = v.play();
              if (p && p.catch) p.catch(function () {});
            }
            // Warm up only the next slide's loop, so it is ready when autoplay moves on
            var next = items[(i + 1) % items.length];
            if (next !== item && !next.video && !item.warmed) {
              item.warmed = true;
              v.addEventListener('canplaythrough', function warm() {
                v.removeEventListener('canplaythrough', warm);
                createVideo(next, 'auto');
              });
            }
          } else if (item.video && !item.video.paused) {
            item.video.pause();
          }
        });
      }
      function schedule() { if (!raf) raf = requestAnimationFrame(update); }

      var mo = new MutationObserver(schedule);
      items.forEach(function (item) { mo.observe(item.slide, { attributes: true, attributeFilter: ['class'] }); });

      var io = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        schedule();
      }, { threshold: 0.15 });
      io.observe(wrapper);

      onEvt(document, 'visibilitychange', schedule);
      onEvt(document, 'bunnylightbox:change', schedule);
      if (reduceMotion.addEventListener) onEvt(reduceMotion, 'change', schedule);

      cleanups.push(function () {
        mo.disconnect();
        io.disconnect();
        if (raf) cancelAnimationFrame(raf);
        items.forEach(function (item) {
          if (!item.video) return;
          item.video.pause();
          item.video.removeAttribute('src');
          item.video.load();
          item.video.remove();
          item.video = null;
          item.warmed = false;
          item.holder.classList.remove('is-playing');
        });
      });

      schedule();
    });
  }

  /* ---------- Osmo Bunny lightbox player (MP4) ---------- */
  function initBunnyLightbox() {
    var lightboxes = document.querySelectorAll('[data-bunny-lightbox-status]');
    if (!lightboxes.length) return;
    var lb = lightboxes[0];
    var player = lb.querySelector('[data-bunny-lightbox-init]');
    var calc = lb.querySelector('[data-bunny-lightbox-calc-height]');
    if (!player) return;

    // Escape transformed page containers so position:fixed covers the viewport
    var originalParent = lb.parentNode, originalNext = lb.nextSibling;
    document.body.appendChild(lb);

    var before = player.querySelector('[data-player-before]');
    var video = document.createElement('video');
    video.className = 'bunny-lightbox-player__video';
    video.preload = 'none';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    if (before && before.nextSibling) player.insertBefore(video, before.nextSibling);
    else player.appendChild(video);

    var progressEl = player.querySelector('[data-player-progress]');
    var bufferedEl = player.querySelector('[data-player-buffered]');
    var handleEl = player.querySelector('[data-player-timeline-handle]');
    var timeline = player.querySelector('[data-player-timeline]');
    var timeNow = player.querySelector('[data-player-time-progress]');
    var timeDur = player.querySelector('[data-player-time-duration]');
    var closeBtn = lb.querySelector('button[data-bunny-lightbox-control="close"]') || lb.querySelector('[data-bunny-lightbox-control="close"]');

    var ratio = 16 / 9;
    var hoverTimer = null;
    var resetTimer = null;
    var lastFocus = null;
    var blockedWrapper = null;
    var dragging = false;

    function setAttr(name, val) { player.setAttribute(name, val); }
    function setStatus(s) { setAttr('data-player-status', s); }

    function sizePlayer() {
      if (!calc) return;
      var w = calc.clientWidth, h = calc.clientHeight;
      if (!w || !h) return;
      player.style.width = (w / ratio > h) ? Math.floor(h * ratio) + 'px' : '100%';
    }
    function setRatio(w, h) {
      if (!w || !h) return;
      ratio = w / h;
      if (before && player.getAttribute('data-player-update-size') !== 'false') before.style.paddingTop = (h / w * 100) + '%';
      sizePlayer();
    }

    function renderTime() {
      var d = video.duration, t = video.currentTime;
      var r = d > 0 ? Math.min(t / d, 1) : 0;
      if (progressEl) progressEl.style.transform = 'translateX(' + ((r - 1) * 100) + '%)';
      if (handleEl) handleEl.style.left = (r * 100) + '%';
      if (timeNow) timeNow.textContent = fmt(t);
    }
    function renderBuffered() {
      if (!bufferedEl || !(video.duration > 0) || !video.buffered.length) return;
      var end = video.buffered.end(video.buffered.length - 1);
      bufferedEl.style.transform = 'translateX(' + ((Math.min(end / video.duration, 1) - 1) * 100) + '%)';
    }
    function resetUi() {
      if (progressEl) progressEl.style.transform = '';
      if (bufferedEl) bufferedEl.style.transform = '';
      if (handleEl) handleEl.style.left = '0%';
      if (timeNow) timeNow.textContent = '00:00';
      if (timeDur) timeDur.textContent = '00:00';
    }

    function play() {
      var p = video.play();
      if (p && p.catch) p.catch(function () {
        // Autoplay with sound blocked: fall back to muted playback
        video.muted = true;
        setAttr('data-player-muted', 'true');
        var p2 = video.play();
        if (p2 && p2.catch) p2.catch(function () { setStatus('paused'); });
      });
    }

    // Pause the slider autoplay while the lightbox is open
    function holdSlider(trigger) {
      var wrapper = trigger && trigger.closest('[data-centered-slider="wrapper"]');
      if (!wrapper) return;
      blockedWrapper = wrapper;
      wrapper.addEventListener('mouseleave', swallow, true);
      wrapper.dispatchEvent(new Event('mouseenter'));
    }
    function releaseSlider() {
      if (!blockedWrapper) return;
      var w = blockedWrapper;
      blockedWrapper = null;
      w.removeEventListener('mouseleave', swallow, true);
      if (!w.matches(':hover')) w.dispatchEvent(new Event('mouseleave'));
    }
    function swallow(e) { e.stopImmediatePropagation(); }

    function open(src, poster, trigger) {
      if (!src) return;
      clearTimeout(resetTimer);
      lastFocus = document.activeElement;
      holdSlider(trigger);

      setAttr('data-player-src', src);
      setAttr('data-player-activated', 'true');
      setAttr('data-player-hover', 'active');
      setStatus('loading');
      if (poster) video.poster = poster; else video.removeAttribute('poster');
      if (video.getAttribute('src') !== src) {
        resetUi();
        video.src = src;
        video.preload = 'auto';
        video.load();
      } else {
        video.currentTime = 0;
      }
      var startMuted = player.getAttribute('data-player-muted') === 'true';
      video.muted = startMuted;

      lb.setAttribute('data-bunny-lightbox-status', 'active');
      lb.setAttribute('aria-hidden', 'false');
      document.documentElement.setAttribute(OPEN_ATTR, '');
      document.dispatchEvent(new CustomEvent('bunnylightbox:change', { detail: { open: true } }));
      if (window.lenis && window.lenis.stop) window.lenis.stop();
      sizePlayer();

      if (player.getAttribute('data-player-autoplay') !== 'false') play();
      else setStatus('paused');
      if (closeBtn && closeBtn.focus) closeBtn.focus({ preventScroll: true });
    }

    function close(instant) {
      if (lb.getAttribute('data-bunny-lightbox-status') !== 'active' && !instant) return;
      video.pause();
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      lb.setAttribute('data-bunny-lightbox-status', 'not-active');
      lb.setAttribute('aria-hidden', 'true');
      document.documentElement.removeAttribute(OPEN_ATTR);
      document.dispatchEvent(new CustomEvent('bunnylightbox:change', { detail: { open: false } }));
      if (window.lenis && window.lenis.start) window.lenis.start();
      releaseSlider();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });

      var reset = function () {
        video.removeAttribute('src');
        video.removeAttribute('poster');
        video.load();
        setAttr('data-player-src', '');
        setAttr('data-player-activated', 'false');
        setAttr('data-player-hover', 'idle');
        setStatus('idle');
        resetUi();
      };
      clearTimeout(resetTimer);
      if (instant) reset(); else resetTimer = setTimeout(reset, 450);
    }

    function togglePlay() {
      if (video.paused || video.ended) play(); else video.pause();
    }
    function toggleMute() {
      video.muted = !video.muted;
      setAttr('data-player-muted', video.muted ? 'true' : 'false');
    }
    function toggleFullscreen() {
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else if (player.requestFullscreen) {
        player.requestFullscreen().catch(function () {});
      } else if (player.webkitRequestFullscreen) {
        player.webkitRequestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen(); // iOS
      }
    }
    function onFullscreenChange() {
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      setAttr('data-player-fullscreen', fsEl === player ? 'true' : 'false');
    }

    function wakeInterface() {
      setAttr('data-player-hover', 'active');
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () {
        if (!dragging) setAttr('data-player-hover', 'idle');
      }, 2500);
    }

    function seekFromEvent(e) {
      var rect = timeline.getBoundingClientRect();
      var r = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
      if (video.duration > 0) { video.currentTime = r * video.duration; renderTime(); }
    }

    // Video events
    onEvt(video, 'loadedmetadata', function () {
      setRatio(video.videoWidth, video.videoHeight);
      if (timeDur) timeDur.textContent = fmt(video.duration);
    });
    onEvt(video, 'play', function () { setStatus('loading'); });
    onEvt(video, 'playing', function () { setStatus('playing'); wakeInterface(); });
    onEvt(video, 'waiting', function () { if (!video.paused) setStatus('loading'); });
    onEvt(video, 'pause', function () { setStatus('paused'); setAttr('data-player-hover', 'active'); });
    onEvt(video, 'ended', function () { setStatus('paused'); setAttr('data-player-hover', 'active'); });
    onEvt(video, 'timeupdate', renderTime);
    onEvt(video, 'progress', renderBuffered);
    onEvt(video, 'volumechange', function () { setAttr('data-player-muted', video.muted ? 'true' : 'false'); });
    onEvt(video, 'error', function () { setStatus('paused'); });

    // Controls
    player.querySelectorAll('[data-player-control]').forEach(function (ctrl) {
      onEvt(ctrl, 'click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var type = ctrl.getAttribute('data-player-control');
        if (type === 'playpause') togglePlay();
        else if (type === 'mute') toggleMute();
        else if (type === 'fullscreen') toggleFullscreen();
        wakeInterface();
      });
    });
    lb.querySelectorAll('[data-bunny-lightbox-control="close"]').forEach(function (el) {
      onEvt(el, 'click', function (e) { e.preventDefault(); close(); });
    });

    if (timeline) {
      onEvt(timeline, 'pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        setAttr('data-player-dragging', 'true');
        if (timeline.setPointerCapture) timeline.setPointerCapture(e.pointerId);
        seekFromEvent(e);
      });
      onEvt(timeline, 'pointermove', function (e) { if (dragging) seekFromEvent(e); });
      var endDrag = function () {
        if (!dragging) return;
        dragging = false;
        setAttr('data-player-dragging', 'false');
        wakeInterface();
      };
      onEvt(timeline, 'pointerup', endDrag);
      onEvt(timeline, 'pointercancel', endDrag);
      onEvt(timeline, 'click', function (e) { e.stopPropagation(); });
    }

    onEvt(player, 'pointermove', wakeInterface);
    onEvt(document, 'fullscreenchange', onFullscreenChange);
    onEvt(document, 'webkitfullscreenchange', onFullscreenChange);
    onEvt(window, 'resize', sizePlayer);

    // Keyboard
    onEvt(document, 'keydown', function (e) {
      if (lb.getAttribute('data-bunny-lightbox-status') !== 'active') return;
      if (e.key === 'Escape') { close(); }
      else if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); wakeInterface(); }
      else if (e.key === 'm') { toggleMute(); }
      else if (e.key === 'f') { toggleFullscreen(); }
      else if (e.key === 'ArrowRight' && video.duration > 0) { video.currentTime = Math.min(video.currentTime + 5, video.duration); wakeInterface(); }
      else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(video.currentTime - 5, 0); wakeInterface(); }
    });

    // Open triggers (delegated, so CMS items and clones work)
    function getTrigger(e) {
      var t = e.target.closest && e.target.closest('[data-bunny-lightbox-control="open"]');
      return t && !lb.contains(t) ? t : null;
    }
    function openFromTrigger(trigger) {
      var src = (trigger.getAttribute('data-bunny-lightbox-src') || '').trim();
      if (!src) return;
      var slide = trigger.closest('[data-centered-slider="slide"]');
      // In the centered slider, a click on a side slide should only bring it to the centre
      if (slide && !slide.classList.contains('active')) return;
      var posterImg = null;
      var imgs = (slide || trigger.parentNode).querySelectorAll('img');
      for (var i = 0; i < imgs.length; i++) { if (!trigger.contains(imgs[i])) { posterImg = imgs[i]; break; } }
      var poster = trigger.getAttribute('data-bunny-lightbox-poster') || (posterImg ? (posterImg.currentSrc || posterImg.src) : '');
      open(src, poster, trigger);
    }
    onEvt(document, 'click', function (e) {
      var trigger = getTrigger(e);
      if (!trigger) return;
      e.preventDefault();
      openFromTrigger(trigger);
    });
    onEvt(document, 'keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var trigger = getTrigger(e);
      if (!trigger || trigger.tagName === 'BUTTON') return;
      e.preventDefault();
      openFromTrigger(trigger);
    });

    cleanups.push(function () {
      close(true);
      clearTimeout(hoverTimer);
      clearTimeout(resetTimer);
      video.remove();
      if (originalParent && originalParent.isConnected) originalParent.insertBefore(lb, originalNext);
      else lb.remove();
    });
  }

  function teardown() {
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    cleanups = [];
  }
  function init() {
    teardown();
    try { initBunnyLightbox(); } catch (e) { console.warn('[bunny lightbox]', e); }
    try { initSliderVideos(); } catch (e) { console.warn('[slider videos]', e); }
  }

  function boot() {
    init();
    if (window.barba && window.barba.hooks) {
      window.barba.hooks.beforeLeave(teardown);
      window.barba.hooks.after(init);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* ===== src/modules/bunny-player.js ===== */
/*
 * Osmo Bunny player (MP4) for Section / Hero video. CSS stays in the Global Custom Code embed.
 */
(function () {
  var cleanups = [];

  function on(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    cleanups.push(function () { target.removeEventListener(type, fn, opts); });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return '00:00';
    var s = Math.floor(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h > 0 ? (h + ':' + pad2(m) + ':' + pad2(r)) : (pad2(m) + ':' + pad2(r));
  }
  function setText(nodes, text) { nodes.forEach(function (n) { n.textContent = text; }); }
  function safePlay(video) {
    var p = video.play();
    if (p && typeof p.then === 'function') p.catch(function () {});
  }

  function initBunnyPlayer() {
    document.querySelectorAll('[data-bunny-player-init]').forEach(function (player) {
      var src = (player.getAttribute('data-player-src') || '').trim();
      var video = player.querySelector('video');
      if (!src || !video) return;

      try { video.pause(); } catch (_) {}
      try { video.removeAttribute('src'); video.load(); } catch (_) {}

      // Attribute helpers
      function setStatus(s) { if (player.getAttribute('data-player-status') !== s) player.setAttribute('data-player-status', s); }
      function setMutedState(v) { video.muted = !!v; player.setAttribute('data-player-muted', video.muted ? 'true' : 'false'); }
      function setFsAttr(v) { player.setAttribute('data-player-fullscreen', v ? 'true' : 'false'); }
      function setActivated(v) { player.setAttribute('data-player-activated', v ? 'true' : 'false'); }
      function setHover(state) { if (player.getAttribute('data-player-hover') !== state) player.setAttribute('data-player-hover', state); }
      function readyIfIdle() {
        if (!pendingPlay && player.getAttribute('data-player-activated') !== 'true' && player.getAttribute('data-player-status') === 'idle') {
          setStatus('ready');
        }
      }

      // Elements
      var timeline = player.querySelector('[data-player-timeline]');
      var progressBar = player.querySelector('[data-player-progress]');
      var bufferedBar = player.querySelector('[data-player-buffered]');
      var handle = player.querySelector('[data-player-timeline-handle]');
      var timeDurationEls = player.querySelectorAll('[data-player-time-duration]');
      var timeProgressEls = player.querySelectorAll('[data-player-time-progress]');
      var before = player.querySelector('[data-player-before]');

      // Start the timeline empty (also covered in CSS for the moment before this runs)
      if (progressBar) progressBar.style.transform = 'translateX(-100%)';
      if (bufferedBar) bufferedBar.style.transform = 'translateX(-100%)';
      if (handle) handle.style.left = '0%';

      // Flags
      var updateSize = player.getAttribute('data-player-update-size'); // "true" | "cover" | "false"
      var lazyMode = player.getAttribute('data-player-lazy');          // "true" | "meta" | "false"
      var autoplay = player.getAttribute('data-player-autoplay') === 'true';
      var initialMuted = player.getAttribute('data-player-muted') === 'true';
      var pendingPlay = false;
      var isAttached = false;
      var rafId = null;
      var hoverTimer = null;

      if (autoplay) { setMutedState(true); video.loop = true; } else { setMutedState(initialMuted); }
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.playsInline = true;
      if (typeof video.disableRemotePlayback !== 'undefined') video.disableRemotePlayback = true;
      video.autoplay = false;

      function setRatio(w, h) {
        if (updateSize !== 'true' || !before || !w || !h) return;
        before.style.paddingTop = (h / w * 100) + '%';
      }

      // MP4 source handling (replaces HLS logic)
      function attachMedia() {
        if (isAttached) return;
        isAttached = true;
        video.preload = 'auto';
        if (video.getAttribute('src') !== src) video.src = src;
      }

      if (lazyMode === 'meta') {
        // Only fetch metadata (duration + aspect ratio) until the user presses play
        video.preload = 'metadata';
        video.src = src;
      } else if (lazyMode === 'true') {
        video.preload = 'none';
      } else {
        attachMedia();
      }

      // Toggle play / pause
      function togglePlay() {
        if (video.paused || video.ended) {
          attachMedia();
          pendingPlay = true;
          setStatus('loading');
          safePlay(video);
        } else {
          video.pause();
        }
      }
      function toggleMute() {
        video.muted = !video.muted;
        player.setAttribute('data-player-muted', video.muted ? 'true' : 'false');
      }

      // Fullscreen
      function isFsActive() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
      function enterFullscreen() {
        if (player.requestFullscreen) return player.requestFullscreen().catch(function () {});
        if (player.webkitRequestFullscreen) return player.webkitRequestFullscreen();
        if (video.webkitSupportsFullscreen && typeof video.webkitEnterFullscreen === 'function') return video.webkitEnterFullscreen();
      }
      function exitFullscreen() {
        if (document.exitFullscreen) return document.exitFullscreen().catch(function () {});
        if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
        if (video.webkitDisplayingFullscreen && typeof video.webkitExitFullscreen === 'function') return video.webkitExitFullscreen();
      }
      function toggleFullscreen() { if (isFsActive() || video.webkitDisplayingFullscreen) exitFullscreen(); else enterFullscreen(); }
      function onFsChange() {
        var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
        setFsAttr(fsEl === player);
        wakeControls();
      }
      on(document, 'fullscreenchange', onFsChange);
      on(document, 'webkitfullscreenchange', onFsChange);
      on(video, 'webkitbeginfullscreen', function () { setFsAttr(true); });
      on(video, 'webkitendfullscreen', function () { setFsAttr(false); });

      // Controls (delegated)
      on(player, 'click', function (e) {
        var btn = e.target.closest('[data-player-control]');
        if (!btn || !player.contains(btn)) return;
        var type = btn.getAttribute('data-player-control');
        if (type === 'play' || type === 'pause' || type === 'playpause') togglePlay();
        else if (type === 'mute') toggleMute();
        else if (type === 'fullscreen') toggleFullscreen();
      });

      // Time + progress
      function updateTimeTexts() {
        if (timeDurationEls.length) setText(timeDurationEls, formatTime(video.duration));
        if (timeProgressEls.length) setText(timeProgressEls, formatTime(video.currentTime));
      }
      function updateProgressVisuals() {
        if (!video.duration) return;
        var pct = (video.currentTime / video.duration) * 100;
        if (progressBar) progressBar.style.transform = 'translateX(' + (-100 + pct) + '%)';
        if (handle) handle.style.left = pct + '%';
      }
      function loop() {
        updateProgressVisuals();
        if (!video.paused && !video.ended) rafId = requestAnimationFrame(loop);
      }
      function updateBufferedBar() {
        if (!bufferedBar || !video.duration || !video.buffered.length) return;
        var end = video.buffered.end(video.buffered.length - 1);
        bufferedBar.style.transform = 'translateX(' + (-100 + (end / video.duration) * 100) + '%)';
      }

      on(video, 'timeupdate', updateTimeTexts);
      on(video, 'durationchange', function () { updateTimeTexts(); updateBufferedBar(); });
      on(video, 'loadedmetadata', function () {
        updateTimeTexts();
        updateBufferedBar();
        setRatio(video.videoWidth, video.videoHeight);
        readyIfIdle();
      });
      on(video, 'progress', updateBufferedBar);
      on(video, 'canplay', readyIfIdle);
      on(video, 'play', function () { setActivated(true); cancelAnimationFrame(rafId); loop(); setStatus('playing'); });
      on(video, 'playing', function () { pendingPlay = false; setStatus('playing'); });
      on(video, 'pause', function () { pendingPlay = false; cancelAnimationFrame(rafId); updateProgressVisuals(); setStatus('paused'); });
      on(video, 'waiting', function () { setStatus('loading'); });
      on(video, 'ended', function () { pendingPlay = false; cancelAnimationFrame(rafId); updateProgressVisuals(); setStatus('paused'); setActivated(false); });
      on(video, 'error', function () { pendingPlay = false; setStatus('paused'); });

      // Scrubbing
      if (timeline) {
        var dragging = false, wasPlaying = false, targetTime = 0, lastSeekTs = 0, seekThrottle = 180, rect = null;
        function getFraction(x) {
          if (!rect) rect = timeline.getBoundingClientRect();
          var f = (x - rect.left) / rect.width;
          return f < 0 ? 0 : (f > 1 ? 1 : f);
        }
        function previewAt(f) {
          if (!video.duration) return;
          var pct = f * 100;
          if (progressBar) progressBar.style.transform = 'translateX(' + (-100 + pct) + '%)';
          if (handle) handle.style.left = pct + '%';
          if (timeProgressEls.length) setText(timeProgressEls, formatTime(f * video.duration));
        }
        function maybeSeek(now) {
          if (!video.duration || (now - lastSeekTs) < seekThrottle) return;
          lastSeekTs = now;
          video.currentTime = targetTime;
        }
        function onMove(e) {
          if (!dragging) return;
          var f = getFraction(e.clientX);
          targetTime = f * video.duration;
          previewAt(f);
          maybeSeek(performance.now());
          e.preventDefault();
        }
        function onUp() {
          if (!dragging) return;
          dragging = false;
          player.setAttribute('data-timeline-drag', 'false');
          rect = null;
          video.currentTime = targetTime;
          if (wasPlaying) safePlay(video); else { updateProgressVisuals(); updateTimeTexts(); }
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        }
        function onDown(e) {
          if (!video.duration) return;
          dragging = true;
          wasPlaying = !video.paused && !video.ended;
          if (wasPlaying) video.pause();
          player.setAttribute('data-timeline-drag', 'true');
          rect = timeline.getBoundingClientRect();
          var f = getFraction(e.clientX);
          targetTime = f * video.duration;
          previewAt(f);
          maybeSeek(performance.now());
          if (timeline.setPointerCapture) timeline.setPointerCapture(e.pointerId);
          window.addEventListener('pointermove', onMove, { passive: false });
          window.addEventListener('pointerup', onUp, { passive: true });
          e.preventDefault();
        }
        on(timeline, 'pointerdown', onDown, { passive: false });
        on(window, 'resize', function () { if (!dragging) rect = null; });
        cleanups.push(function () {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
        });
      }

      // Hover / idle
      function scheduleHide() {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { setHover('idle'); }, 3000);
      }
      function wakeControls() { setHover('active'); scheduleHide(); }
      function onPointerMoveGlobal(e) {
        var r = player.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) wakeControls();
      }
      on(player, 'pointerdown', wakeControls);
      on(player, 'pointerenter', function () {
        wakeControls();
        window.addEventListener('pointermove', onPointerMoveGlobal, { passive: true });
      });
      on(player, 'pointerleave', function () {
        setHover('idle');
        clearTimeout(hoverTimer);
        window.removeEventListener('pointermove', onPointerMoveGlobal);
      });

      // In-view play / pause (autoplay only)
      var io = null;
      if (autoplay) {
        io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && entry.intersectionRatio > 0) {
              attachMedia();
              if (video.paused) { pendingPlay = true; setStatus('loading'); safePlay(video); }
              else setStatus('playing');
            } else if (!video.paused && !video.ended) {
              video.pause();
              setStatus('paused');
            }
          });
        }, { threshold: 0.1 });
        io.observe(player);
      }

      // Teardown for Barba page leave
      cleanups.push(function () {
        if (io) io.disconnect();
        cancelAnimationFrame(rafId);
        clearTimeout(hoverTimer);
        window.removeEventListener('pointermove', onPointerMoveGlobal);
        if (isFsActive()) exitFullscreen();
        try { video.pause(); video.removeAttribute('src'); video.load(); } catch (_) {}
        player.setAttribute('data-player-status', 'idle');
        player.setAttribute('data-player-activated', 'false');
        player.setAttribute('data-player-hover', 'idle');
        player.setAttribute('data-player-fullscreen', 'false');
      });
    });
  }

  function teardown() {
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    cleanups = [];
  }
  function init() {
    teardown();
    try { initBunnyPlayer(); } catch (e) { console.warn('[bunny player]', e); }
  }
  function boot() {
    init();
    if (window.barba && window.barba.hooks) {
      window.barba.hooks.beforeLeave(teardown);
      window.barba.hooks.after(init);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();


/* ===== src/modules/layer-stack.js ===== */
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


/* ===== src/modules/fade-slider.js ===== */
/*
 * Testimonials fade slider: autoplay timer bars, hover/focus pause, accessible. CSS stays in the Section / Testimonials embed.
 */
(function () {
  if (window.__fadeSlider) {
    window.__fadeSlider.init();
    return;
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function initSlider(root) {
    if (root.__fadeSliderReady) return;

    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-fade-slider="slide"]'));
    if (!slides.length) return;
    root.__fadeSliderReady = true;

    var list = root.querySelector('[data-fade-slider="list"]');
    var progress = root.querySelector('[data-fade-slider="progress"]');
    var prevBtn = root.querySelector('[data-fade-slider="prev"]');
    var nextBtn = root.querySelector('[data-fade-slider="next"]');
    var duration = (parseFloat(root.getAttribute('data-fade-slider-duration')) || 6) * 1000;
    var total = slides.length;
    var uid = 'fade-slider-' + Math.random().toString(36).slice(2, 8);

    var current = 0;
    var bars = [];
    var fills = [];
    var anim = null;
    var hovering = false;
    var keyboardFocus = false;
    var userPaused = false;
    var inView = true;

    // Slide semantics
    slides.forEach(function (slide, i) {
      if (!slide.id) slide.id = uid + '-slide-' + (i + 1);
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', (i + 1) + ' of ' + total);
    });
    if (list) {
      if (!list.id) list.id = uid + '-list';
      list.removeAttribute('role');
      list.setAttribute('aria-live', 'off');
    }

    // One slide: no controls, no autoplay
    if (total < 2) {
      slides[0].classList.add('is-active');
      root.setAttribute('data-fade-slider-ready', '');
      var controls = progress ? progress.parentElement : null;
      if (controls) controls.style.display = 'none';
      return;
    }

    // Timer bars double as slide pickers
    if (progress) {
      progress.innerHTML = '';
      progress.setAttribute('role', 'group');
      progress.setAttribute('aria-label', 'Choose a testimonial');
      slides.forEach(function (slide, i) {
        var bar = document.createElement('button');
        bar.type = 'button';
        bar.className = 'fade-slider_bar';
        bar.setAttribute('aria-label', 'Show testimonial ' + (i + 1) + ' of ' + total);
        bar.setAttribute('aria-controls', slide.id);

        var track = document.createElement('span');
        track.className = 'fade-slider_bar-track';
        track.setAttribute('aria-hidden', 'true');

        var fill = document.createElement('span');
        fill.className = 'fade-slider_bar-fill';

        track.appendChild(fill);
        bar.appendChild(track);
        progress.appendChild(bar);

        bar.addEventListener('click', function () {
          goTo(i, true);
        });

        bars.push(bar);
        fills.push(fill);
      });

      // Pause / play toggle for keyboard and screen reader users (WCAG 2.2.2)
      var toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'fade-slider_toggle';
      progress.parentElement.insertBefore(toggle, progress);
      toggle.addEventListener('click', function () {
        userPaused = !userPaused;
        restart();
      });
      root.__fadeSliderToggle = toggle;
    }

    if (prevBtn) {
      prevBtn.setAttribute('aria-controls', list ? list.id : slides[0].id);
      prevBtn.addEventListener('click', function () { goTo(current - 1, true); });
    }
    if (nextBtn) {
      nextBtn.setAttribute('aria-controls', list ? list.id : slides[0].id);
      nextBtn.addEventListener('click', function () { goTo(current + 1, true); });
    }

    function autoplayEnabled() {
      return !reduceMotion.matches && !userPaused;
    }

    function shouldRun() {
      return autoplayEnabled() && !hovering && !keyboardFocus && inView && !document.hidden;
    }

    function updateToggle() {
      var toggle = root.__fadeSliderToggle;
      if (!toggle) return;
      if (reduceMotion.matches) {
        toggle.hidden = true;
        return;
      }
      toggle.hidden = false;
      toggle.textContent = userPaused ? 'Start automatic slide show' : 'Stop automatic slide show';
    }

    function setActive(index) {
      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        if (active) {
          slide.removeAttribute('inert');
        } else {
          slide.setAttribute('inert', '');
        }
      });
      bars.forEach(function (bar, i) {
        var active = i === index;
        bar.classList.toggle('is-active', active);
        if (active) {
          bar.setAttribute('aria-current', 'true');
        } else {
          bar.removeAttribute('aria-current');
        }
      });
    }

    function stopTimer() {
      if (anim) {
        anim.onfinish = null;
        anim.cancel();
        anim = null;
      }
      fills.forEach(function (fill) {
        fill.style.transform = 'scaleX(0)';
      });
    }

    function startTimer() {
      stopTimer();
      var fill = fills[current];
      if (!fill) return;

      if (!autoplayEnabled() || typeof fill.animate !== 'function') {
        // No autoplay: the active bar is simply shown full
        fill.style.transform = 'scaleX(1)';
        return;
      }

      anim = fill.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: duration, easing: 'linear', fill: 'forwards' }
      );
      anim.onfinish = function () {
        goTo(current + 1, false);
      };
      update();
    }

    function update() {
      if (list) list.setAttribute('aria-live', shouldRun() ? 'off' : 'polite');
      updateToggle();
      if (!anim) return;
      if (shouldRun()) {
        if (anim.playState !== 'running') anim.play();
      } else if (anim.playState === 'running') {
        anim.pause();
      }
    }

    function restart() {
      startTimer();
      update();
    }

    function goTo(index, byUser) {
      current = (index + total) % total;
      if (list) list.setAttribute('aria-live', byUser ? 'polite' : 'off');
      setActive(current);
      startTimer();
    }

    // Pause on mouse hover over the slides only, not the controls (ignores touch, which would get stuck in a hover state)
    var hoverTarget = list || root;
    hoverTarget.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      hovering = true;
      update();
    });
    hoverTarget.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      hovering = false;
      update();
    });

    // Pause while keyboard focus is inside the slider
    root.addEventListener('focusin', function (e) {
      var target = e.target;
      var visible = false;
      try { visible = target.matches(':focus-visible'); } catch (err) { visible = true; }
      keyboardFocus = visible;
      update();
    });
    root.addEventListener('focusout', function (e) {
      if (e.relatedTarget && root.contains(e.relatedTarget)) return;
      keyboardFocus = false;
      update();
    });

    // Pause when the slider is off screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        update();
      }, { threshold: 0.2 }).observe(root);
    }

    document.addEventListener('visibilitychange', update);

    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', restart);
    }

    root.setAttribute('data-fade-slider-ready', '');
    setActive(0);
    startTimer();
  }

  function init() {
    document.querySelectorAll('[data-fade-slider="wrapper"]').forEach(initSlider);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (window.barba && window.barba.hooks) {
    window.barba.hooks.after(init);
  }

  window.__fadeSlider = { init: init };
})();


/* ===== src/modules/capability-table.js ===== */
/*
 * Section / Capabilities: collapsible capability groups in the plan comparison table.
 * Markup: [data-capability-group] > button[data-capability-toggle] + [data-capability-rows]
 * Groups start open (aria-expanded="true" in Webflow). CSS lives in the Section / Capabilities embed.
 */
function initCapabilityTable() {
  const groups = document.querySelectorAll("[data-capability-group]");
  if (!groups.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function refreshScroll() {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  groups.forEach(function (group, i) {
    const toggle = group.querySelector("[data-capability-toggle]");
    const rows = group.querySelector("[data-capability-rows]");
    if (!toggle || !rows || toggle.dataset.capabilityBound) return;
    toggle.dataset.capabilityBound = "true";

    if (!rows.id) rows.id = "capability-rows-" + (i + 1);
    toggle.setAttribute("aria-controls", rows.id);

    let open = toggle.getAttribute("aria-expanded") !== "false";
    rows.hidden = !open;

    toggle.addEventListener("click", function () {
      open = !open;
      toggle.setAttribute("aria-expanded", String(open));
      gsap.killTweensOf(rows);

      if (reduceMotion) {
        rows.hidden = !open;
        gsap.set(rows, { clearProps: "height" });
        refreshScroll();
        return;
      }

      if (open) {
        rows.hidden = false;
        gsap.fromTo(rows, { height: 0 }, {
          height: "auto",
          duration: 0.4,
          ease: "power2.out",
          clearProps: "height",
          onComplete: refreshScroll
        });
      } else {
        gsap.to(rows, {
          height: 0,
          duration: 0.35,
          ease: "power2.inOut",
          onComplete: function () {
            rows.hidden = true;
            gsap.set(rows, { clearProps: "height" });
            refreshScroll();
          }
        });
      }
    });
  });
}


/* ===== src/modules/faq.js ===== */
/*
 * Section / FAQ: CMS-driven accordion.
 * Markup: [data-faq-item] > button[data-faq-toggle] + [data-faq-answer]
 * The animation is CSS (grid-template-rows, 0.6s Osmo ease) in the Section / FAQ embed; this script only manages state and ARIA.
 * - The top item opens on load, without animating (transitions switch on via [data-faq-ready] one frame later).
 * - data-faq-close-siblings="true" on the toggle (Section / FAQ prop "One open at a time") closes the other items in the same list.
 */
function initFaq() {
  const items = document.querySelectorAll("[data-faq-item]");
  if (!items.length) return;

  function refreshScroll() {
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  function setOpen(toggle, open) {
    toggle.setAttribute("aria-expanded", String(open));
  }

  // Number per list so two FAQ sections on one page each open their own top item
  const lists = new Map();
  items.forEach(function (item) {
    const list = item.parentElement;
    if (!lists.has(list)) lists.set(list, []);
    lists.get(list).push(item);
  });

  let count = 0;

  lists.forEach(function (listItems, list) {
    listItems.forEach(function (item, i) {
      const toggle = item.querySelector("[data-faq-toggle]");
      const answer = item.querySelector("[data-faq-answer]");
      if (!toggle || !answer || toggle.dataset.faqBound) return;
      toggle.dataset.faqBound = "true";

      count += 1;
      if (!toggle.id) toggle.id = "faq-toggle-" + count;
      if (!answer.id) answer.id = "faq-answer-" + count;
      toggle.setAttribute("aria-controls", answer.id);
      answer.setAttribute("aria-labelledby", toggle.id);
      setOpen(toggle, i === 0);

      toggle.addEventListener("click", function () {
        const open = toggle.getAttribute("aria-expanded") !== "true";

        if (open && toggle.getAttribute("data-faq-close-siblings") === "true") {
          list.querySelectorAll("[data-faq-toggle]").forEach(function (other) {
            if (other !== toggle) setOpen(other, false);
          });
        }

        setOpen(toggle, open);
      });

      answer.addEventListener("transitionend", function (e) {
        if (e.target === answer && e.propertyName === "grid-template-rows") refreshScroll();
      });
    });

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        listItems.forEach(function (item) {
          item.setAttribute("data-faq-ready", "");
        });
      });
    });
  });
}


/* ===== src/core/master-init.js ===== */
/*
 * Master init: runs every page-level init on first load and after each Barba transition. Must load last.
 */
function safeInit(fn) {
  try { fn(); } catch (e) { console.warn('[init failed]', fn.name, e); }
}

function initPageScripts() {
  runPageCleanups();
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());

  document.fonts.ready.then(() => safeInit(initMaskTextScrollReveal));

  [
    initButtonIconRecolour,
    initSwiperAccessibility,
    initCSSMarquee,
    initSliders,
    initHeroImageScale,
    initCardsStagger,
    initFadeInReveal,
    initNumberOdometer,
    initDividerGrowReveal,
    initParallaxImages,
    initBackToTop,
    initLogoWallCycle,
    initCardStack,
    initCapabilityTable,
    initFaq
  ].forEach(safeInit);

  ScrollTrigger.refresh();
}

document.addEventListener("DOMContentLoaded", () => {
  initPageScripts();
});
