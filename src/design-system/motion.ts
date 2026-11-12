/* Motion helpers. Tokens live in tokens/speculara.json (--motion-*, --ease-*); CSS handles simple transitions.
   GSAP is used only for timelines (logo reveal, loader). It is loaded on demand so it never delays first paint. */
export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** The loading screen plays on every load. It never plays for reduced motion, and never in automated
 *  test browsers unless ?splash=1 forces it. */
export function shouldPlaySplash(): boolean {
  if (typeof window === "undefined") return false;
  const forced = new URLSearchParams(window.location.search).get("splash") === "1";
  if (prefersReducedMotion()) return false; // never, even when forced
  if (!forced && navigator.webdriver) return false;
  return true;
}

/** Start downloading the animation library early (only when the splash will actually play),
 *  so the reveal begins on time instead of waiting for the chunk. */
export function preloadMotion() {
  if (shouldPlaySplash()) void import("gsap");
}
