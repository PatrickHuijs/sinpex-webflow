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
