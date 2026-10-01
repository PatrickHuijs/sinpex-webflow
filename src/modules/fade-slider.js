/*
 * Testimonials fade slider: autoplay timer bars, hover/focus pause, accessible. CSS stays in the Section / Testimonials embed.
 */
(function () {
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
    var observer = null;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        update();
      }, { threshold: 0.2 });
      observer.observe(root);
    }

    document.addEventListener('visibilitychange', update);

    if (typeof reduceMotion.addEventListener === 'function') {
      reduceMotion.addEventListener('change', restart);
    }

    // Teardown before a Barba page change: stop the timer and drop the global listeners
    pageCleanups.push(function () {
      stopTimer();
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      if (typeof reduceMotion.removeEventListener === 'function') {
        reduceMotion.removeEventListener('change', restart);
      }
      if (root.__fadeSliderToggle) root.__fadeSliderToggle.remove();
      root.__fadeSliderToggle = null;
      root.__fadeSliderReady = false;
    });

    root.setAttribute('data-fade-slider-ready', '');
    setActive(0);
    startTimer();
  }

  function init() {
    document.querySelectorAll('[data-fade-slider="wrapper"]').forEach(initSlider);
  }

  // Started by master-init (first load and after every Barba transition), so its teardown runs with the other modules
  window.initFadeSliders = init;
  window.__fadeSlider = { init: init };
})();
