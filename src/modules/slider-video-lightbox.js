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
