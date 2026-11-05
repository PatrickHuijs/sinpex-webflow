/*
 * Spotlight video: optional muted looping MP4 on the spotlight card (Section / Spotlight, Section / Featured resource).
 * Markup: video[data-spotlight-video][data-spotlight-video-src="<url to .mp4>"] inside .spotlight-card_image,
 *         src bound to the Resources "Spotlight video URL" CMS field. Empty field: nothing happens, the image stays.
 * - Loads when the card is half a viewport away, so the file is never fetched for a card the visitor doesn't reach.
 * - Plays once 25% of the video is visible, pauses when it is completely out of view, plays again when it comes back.
 * - The image stays visible until the first frame plays ([data-spotlight-video-status="playing"]), so it is the poster
 *   while loading and the fallback without JS, with reduced motion, if autoplay is blocked or if the file fails.
 * - Always muted and without controls: the whole card is one link (modules/spotlight-card-link.js).
 * - Unloaded on Barba page changes.
 * CSS: Global Custom Code > SPOTLIGHT CARD.
 */
function initSpotlightVideos() {
  const targets = Array.from(document.querySelectorAll("[data-spotlight-video]")).filter(
    (el) => (el.getAttribute("data-spotlight-video-src") || "").trim() !== ""
  );
  if (!targets.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const PLAY_RATIO = 0.25;
  const inView = new Set(); // videos that have reached PLAY_RATIO and not left the viewport since

  function play(video) {
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }

  function load(video) {
    video.setAttribute("data-spotlight-video-fired", "true");
    video.preload = "auto";
    video.src = video.getAttribute("data-spotlight-video-src").trim();
    video.load();
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
        if (!entry.isIntersecting) {
          inView.delete(video);
          video.pause();
        } else if (entry.intersectionRatio >= PLAY_RATIO) {
          inView.add(video);
          if (video.hasAttribute("data-spotlight-video-fired")) play(video);
        }
      });
    },
    { threshold: [0, PLAY_RATIO] }
  );

  targets.forEach((video) => {
    // Autoplay only works muted and inline
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");

    video.addEventListener("playing", () => video.setAttribute("data-spotlight-video-status", "playing"));
    video.addEventListener("canplay", () => { if (inView.has(video)) play(video); });

    loadObserver.observe(video);
    playObserver.observe(video);
  });

  pageCleanups.push(() => {
    loadObserver.disconnect();
    playObserver.disconnect();
    targets.forEach((video) => {
      try { video.pause(); } catch (e) {}
      video.removeAttribute("src");
      try { video.load(); } catch (e) {}
      video.removeAttribute("data-spotlight-video-fired");
      video.removeAttribute("data-spotlight-video-status");
    });
  });
}
