/*
 * Layer video: plays a muted looping MP4 (e.g. on Bunny) when it scrolls into view. Replaces the Lottie setup.
 * Markup: video[data-layer-video][data-layer-video-src="<url to .mp4>"]
 *   Layer feature: video.layer-feature_video inside .layer-feature_visual, src bound to the Video URL prop.
 *   Empty src: the video is hidden by CSS and the image shows instead (Section / Layer features embed).
 * - Each video loads when it is half a viewport away and first plays when its top reaches the viewport centre,
 *   so it starts when the section is clearly in view. After that it pauses when its centre hits the top of the
 *   viewport or when it leaves at the bottom, and plays again when it comes back past those lines.
 * - The image stays visible until the first frame plays ([data-layer-video-status="playing"]), so there is no black flash.
 * - Reduced motion: the video is never loaded and the image stays.
 * - If the file fails to load, [data-layer-video-failed] is set so the CSS keeps the image.
 * - Unloaded on Barba page changes.
 */
function initLayerVideos() {
  const targets = Array.from(document.querySelectorAll("[data-layer-video]")).filter(
    (el) => (el.getAttribute("data-layer-video-src") || "").trim() !== ""
  );
  if (!targets.length) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  pageCleanups.push(() => {
    targets.forEach((video) => {
      try { video.pause(); } catch (e) {}
      video.removeAttribute("src");
      try { video.load(); } catch (e) {}
      video.removeAttribute("data-layer-video-fired");
      video.removeAttribute("data-layer-video-failed");
      video.removeAttribute("data-layer-video-status");
    });
  });

  targets.forEach((video) => {
    let inView = false;
    let started = false; // the top of the video has reached the viewport centre

    // Autoplay only works muted and inline
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("muted", "");

    const play = () => {
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    };

    video.addEventListener("playing", () => video.setAttribute("data-layer-video-status", "playing"));
    video.addEventListener("error", () => video.setAttribute("data-layer-video-failed", "true"));
    video.addEventListener("canplay", () => { if (inView && started) play(); });

    function load() {
      video.setAttribute("data-layer-video-fired", "true");
      video.preload = "auto";
      video.src = video.getAttribute("data-layer-video-src").trim();
      video.load();
    }

    // Load half a viewport early
    ScrollTrigger.create({
      trigger: video,
      start: "top bottom+=50%",
      end: "bottom top-=50%",
      onEnter: () => { if (!video.hasAttribute("data-layer-video-fired")) load(); },
      onEnterBack: () => { if (!video.hasAttribute("data-layer-video-fired")) load(); }
    });

    // First play: top of the video at the viewport centre
    ScrollTrigger.create({
      trigger: video,
      start: "top center",
      once: true,
      onEnter: () => {
        started = true;
        if (inView && video.hasAttribute("data-layer-video-fired")) play();
      }
    });

    // Play only between the viewport bottom and the centre of the video reaching the viewport top
    ScrollTrigger.create({
      trigger: video,
      start: "top bottom",
      end: "center top",
      onToggle: (self) => {
        inView = self.isActive;
        if (!video.hasAttribute("data-layer-video-fired")) return;
        if (!inView) video.pause();
        else if (started) play();
      }
    });
  });
}
