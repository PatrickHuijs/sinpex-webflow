/*
 * Section / Image slider + Section / Hero slider: centred, looping image slider with progress bars and prev/next buttons.
 * Markup: [data-image-slider="wrapper"] > .image-slider_track > [data-image-slider="slide"] (3 fixed + extra via slot)
 *         [data-image-slider="progress"] (bars are built here), [data-image-slider="prev"|"next"], [data-image-slider="status"]
 * - Uses horizontalLoop() from centered-slider.js (seamless loop, centred, draggable).
 * - Keyboard: left/right arrows while focus is inside the slider. Screen readers get "Image x of y" via the status element.
 * - Autoplay (opt-in, same attributes as the Proof slider): data-slider-autoplay="true" + data-slider-autoplay-duration="5" (seconds) on the wrapper.
 *   Pauses on mouse hover over the slides (the track, not the controls), on keyboard focus inside the slider, off screen and in a hidden tab.
 *   Off with prefers-reduced-motion. A stop/start button is added for keyboard and screen reader users (WCAG 2.2.2).
 * CSS lives in the Section / Image slider and Section / Hero slider embeds.
 */
function initImageSlider() {
  const wrappers = document.querySelectorAll('[data-image-slider="wrapper"]');
  if (!wrappers.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  wrappers.forEach((wrapper) => {
    if (wrapper.dataset.imageSliderReady) return;

    const slides = Array.from(wrapper.querySelectorAll('[data-image-slider="slide"]'));
    if (slides.length < 2) return;
    wrapper.dataset.imageSliderReady = "true";

    const track = wrapper.querySelector(".image-slider_track") || wrapper;
    const progress = wrapper.querySelector('[data-image-slider="progress"]');
    const prevButton = wrapper.querySelector('[data-image-slider="prev"]');
    const nextButton = wrapper.querySelector('[data-image-slider="next"]');
    const status = wrapper.querySelector('[data-image-slider="status"]');
    const total = slides.length;

    const autoplayOn = wrapper.getAttribute("data-slider-autoplay") === "true";
    const autoplayDuration = parseFloat(wrapper.getAttribute("data-slider-autoplay-duration")) || 5;

    const ease = () => ({ ease: "osmo-ease", duration: reduceMotion.matches ? 0 : 0.725 });

    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-roledescription", "carousel");
    if (!wrapper.hasAttribute("aria-label")) wrapper.setAttribute("aria-label", "Image slider");

    slides.forEach((slide, i) => {
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${i + 1} of ${total}`);
      slide.querySelectorAll("img").forEach((img) => { img.draggable = false; });
    });

    // One bar per slide
    let bars = [];
    if (progress) {
      progress.innerHTML = "";
      progress.setAttribute("aria-hidden", "true");
      bars = slides.map(() => {
        const bar = document.createElement("div");
        bar.className = "image-slider_bar";
        progress.appendChild(bar);
        return bar;
      });
    }

    let currentIndex = 0;
    let timer = null;
    let hovering = false;
    let keyboardFocus = false;
    let inView = false;
    let userPaused = false;
    let toggle = null;

    function setActive(index) {
      currentIndex = index;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      bars.forEach((bar, i) => bar.classList.toggle("is-active", i === index));
      if (status) status.textContent = `Image ${index + 1} of ${total}`;
      // Any change (autoplay, buttons, drag, keys) gives the new slide a full interval
      if (timer) { stopTimer(); update(); }
    }

    const loop = horizontalLoop(slides, {
      paused: true,
      draggable: true,
      center: true,
      onChange: (element, index) => setActive(index)
    });

    loop.toIndex(0, { duration: 0 });
    setActive(0);

    const goTo = (index) => loop.toIndex(((index % total) + total) % total, ease());
    const onPrev = () => goTo(currentIndex - 1);
    const onNext = () => goTo(currentIndex + 1);
    const onKey = (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); onPrev(); }
      if (e.key === "ArrowRight") { e.preventDefault(); onNext(); }
    };

    if (prevButton) prevButton.addEventListener("click", onPrev);
    if (nextButton) nextButton.addEventListener("click", onNext);
    wrapper.addEventListener("keydown", onKey);

    // Autoplay
    function shouldRun() {
      return autoplayOn && !reduceMotion.matches && !userPaused && !hovering && !keyboardFocus && inView && !document.hidden;
    }

    function stopTimer() {
      if (timer) { timer.kill(); timer = null; }
    }

    function update() {
      if (toggle) {
        toggle.hidden = reduceMotion.matches;
        toggle.textContent = userPaused ? "Start automatic slide show" : "Stop automatic slide show";
      }
      if (status) status.setAttribute("aria-live", shouldRun() ? "off" : "polite");
      if (shouldRun()) {
        if (!timer) timer = gsap.delayedCall(autoplayDuration, () => { timer = null; onNext(); update(); });
      } else {
        stopTimer();
      }
    }

    const onPointerEnter = (e) => { if (e.pointerType === "mouse") { hovering = true; update(); } };
    const onPointerLeave = (e) => { if (e.pointerType === "mouse") { hovering = false; update(); } };
    const onFocusIn = (e) => {
      let visible = false;
      try { visible = e.target.matches(":focus-visible"); } catch (err) { visible = true; }
      keyboardFocus = visible;
      update();
    };
    const onFocusOut = (e) => {
      if (e.relatedTarget && wrapper.contains(e.relatedTarget)) return;
      keyboardFocus = false;
      update();
    };

    let observer = null;
    if (autoplayOn) {
      // Stop/start control for keyboard and screen reader users, placed before the progress bars
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "image-slider_toggle";
      toggle.addEventListener("click", () => { userPaused = !userPaused; update(); });
      if (progress && progress.parentElement) progress.parentElement.insertBefore(toggle, progress);
      else wrapper.appendChild(toggle);

      track.addEventListener("pointerenter", onPointerEnter);
      track.addEventListener("pointerleave", onPointerLeave);
      wrapper.addEventListener("focusin", onFocusIn);
      wrapper.addEventListener("focusout", onFocusOut);
      document.addEventListener("visibilitychange", update);
      if (typeof reduceMotion.addEventListener === "function") reduceMotion.addEventListener("change", update);

      if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; update(); }, { threshold: 0.2 });
        observer.observe(wrapper);
      } else {
        inView = true;
      }
      update();
    }

    pageCleanups.push(() => {
      stopTimer();
      if (observer) observer.disconnect();
      if (toggle) toggle.remove();
      track.removeEventListener("pointerenter", onPointerEnter);
      track.removeEventListener("pointerleave", onPointerLeave);
      wrapper.removeEventListener("focusin", onFocusIn);
      wrapper.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", update);
      if (typeof reduceMotion.removeEventListener === "function") reduceMotion.removeEventListener("change", update);
      if (prevButton) prevButton.removeEventListener("click", onPrev);
      if (nextButton) nextButton.removeEventListener("click", onNext);
      wrapper.removeEventListener("keydown", onKey);
      if (typeof loop.removeResize === "function") loop.removeResize();
      if (loop.draggable) loop.draggable.kill();
      loop.kill();
      delete wrapper.dataset.imageSliderReady;
    });
  });
}
