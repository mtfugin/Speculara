/* Loading screen with the logo: 1.5 seconds, every load.
   0.00s  black screen with a faint grid; thin lines of light glide across it the whole time
   0.08s  three bars rise from the mirror line
   0.45s  the reflection answers below
   0.85s  the wordmark rises in
   1.25s  the screen fades out
   1.50s  gone
   Click, tap or Esc skips it. Reduced motion and automated browsers skip it entirely (add ?splash=1 to force it). */
import { useEffect, useState } from "react";
import { AnimatedMark } from "./AnimatedMark";
import { shouldPlaySplash } from "./motion";
import { Wordmark } from "./Logo";
import LineFlow from "./LineFlow";

export const SPLASH_MS = 1500;
const FADE_MS = 250;

export function Splash() {
  const [phase, setPhase] = useState<"off" | "on" | "out">(() => (shouldPlaySplash() ? "on" : "off"));
  /* Skipping fades out quickly and removes the screen. */
  const dismiss = () => {
    setPhase("out");
    window.setTimeout(() => setPhase("off"), FADE_MS);
  };
  /* Both timers start at mount, so the screen is gone at exactly SPLASH_MS. */
  useEffect(() => {
    if (!shouldPlaySplash()) return;
    const fade = window.setTimeout(() => setPhase((p) => (p === "on" ? "out" : p)), SPLASH_MS - FADE_MS);
    const gone = window.setTimeout(() => setPhase("off"), SPLASH_MS);
    const skip = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(gone);
      window.removeEventListener("keydown", skip);
    };
  }, []);
  if (phase === "off") return null;
  return (
    <div
      role="presentation"
      data-splash
      onClick={dismiss}
      className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-canvas"
      style={{ opacity: phase === "out" ? 0 : 1, transition: `opacity ${FADE_MS}ms var(--ease-exit)` }}
    >
      <LineFlow speed={5} />
      <div className="relative z-10 flex items-center gap-4" aria-hidden="true">
        <AnimatedMark size={84} mode="reveal" />
        <span className="splash-word">
          <Wordmark className="text-5xl" />
        </span>
      </div>
    </div>
  );
}
