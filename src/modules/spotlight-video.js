/*
 * Spotlight video: optional MP4 with player controls on the spotlight card (Section / Spotlight, Section / Featured resource).
 * Markup: video[data-spotlight-video][data-spotlight-video-src="<url to .mp4>"] inside .spotlight-card_image,
 *         src bound to the Resources "Spotlight video URL" CMS field. Empty field: nothing happens, the image stays.
 * - Loads when the card is half a viewport away, so the file is never fetched for a card the visitor doesn't reach.
 * - Starts muted once 25% of the video is visible, pauses when it is completely out of view, plays again when it comes
 *   back. Sound is up to the visitor (player controls), and a visitor's pause stands until they press play.
 * - The poster is transparent, so the card image behind the video shows until the first frame, without a black flash.
 * - Reduced motion: no autoplay, the image and the controls show and the visitor starts the video.
 * - No JS or a file that fails: the video stays hidden and the image shows.
 * - Unloaded on Barba page changes.
 * The link covers the text column only, so the controls stay clickable (Global Custom Code > SPOTLIGHT CARD, also the 16:9 frame).
 */
function initSpotlightVideos() {
  const targets = Array.from(document.querySelectorAll("[data-spotlight-video]")).filter(
    (el) => (el.getAttribute("data-spotlight-video-src") || "").trim() !== ""
  );
  if (!targets.length) return;

  const autoplay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PLAY_RATIO = 0.25;
  const POSTER = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  const states = new Map();

  function play(video) {
    if (!autoplay || states.get(video).visitorPaused) return;
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }

  function pause(video) {
    if (video.paused) return;
    states.get(video).scriptPaused = true;
    video.pause();
  }

  function load(video) {
    const heading = video.closest(".spotlight-card")?.querySelector("h1, h2, h3");
    const title = heading ? (heading.textContent || "").replace(/\s+/g, " ").trim() : "";

    video.setAttribute("data-spotlight-video-status", "ready");
    video.removeAttribute("aria-hidden");
    video.setAttribute("aria-label", title ? "Video: " + title : "Video");
    video.controls = true;
    video.preload = autoplay ? "auto" : "none";
    video.src = video.getAttribute("data-spotlight-video-src").trim();
    video.load();
  }

  function unload(video) {
    video.removeAttribute("data-spotlight-video-status");
    video.removeAttribute("aria-label");
    video.setAttribute("aria-hidden", "true");
    video.controls = false;
  }

  const loadObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        loadObserver.unobserve(entry.target);
        load(entry.target);
      });
    },
    { rootMargin: "50% 0px" }
  );

  const playObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        const state = states.get(video);
        if (!entry.isIntersecting) {
          state.inView = false;
          pause(video);
        } else if (entry.intersectionRatio >= PLAY_RATIO) {
          state.inView = true;
          if (video.hasAttribute("data-spotlight-video-status")) play(video);
        }
      });
    },
    { threshold: [0, PLAY_RATIO] }
  );

  targets.forEach((video) => {
    const state = { inView: false, visitorPaused: false, scriptPaused: false };
    states.set(video, state);

    // Autoplay only works muted and inline
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");
    video.poster = POSTER;

    video.addEventListener("canplay", () => { if (state.inView && video.paused) play(video); });
    video.addEventListener("play", () => { state.visitorPaused = false; });
    video.addEventListener("pause", () => {
      if (state.scriptPaused) state.scriptPaused = false;
      else state.visitorPaused = true;
    });
    video.addEventListener("error", () => unload(video));

    loadObserver.observe(video);
    playObserver.observe(video);
  });

  pageCleanups.push(() => {
    loadObserver.disconnect();
    playObserver.disconnect();
    targets.forEach((video) => {
      const state = states.get(video);
      state.scriptPaused = true;
      try { video.pause(); } catch (e) {}
      video.removeAttribute("src");
      video.removeAttribute("poster");
      try { video.load(); } catch (e) {}
      unload(video);
    });
  });
}
