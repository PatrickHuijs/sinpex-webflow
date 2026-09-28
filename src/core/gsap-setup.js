/*
 * Register GSAP plugins and the persistent osmo-ease. Runs once.
 */
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, Draggable, InertiaPlugin);
CustomEase.create("osmo-ease", "0.625, 0.05, 0, 1");
