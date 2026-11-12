/* Signature brand moment, once per session (a 800 to 1500ms brand reveal).
   Storyboard: 0.0s circles arrive from opposite corners, 0.65s they meet and the lens opens (one soft emphasis),
   1.0s the wordmark rises in, 1.7s the screen fades away. Click, tap or Esc skips it.
   Reduced motion, automated browsers and repeat visits skip it entirely: the content is simply there. */
import { useEffect, useState } from "react";
import { AnimatedMark } from "./AnimatedMark";
import { markSplashSeen, shouldPlaySplash } from "./motion";
import { Wordmark } from "./Logo";

export function Splash() {
  const [phase, setPhase] = useState<"off" | "on" | "out">(() => (shouldPlaySplash() ? "on" : "off"));
  useEffect(() => {
    if (phase !== "on") return;
    const hold = window.setTimeout(() => setPhase("out"), 1700);
    const skip = (e: KeyboardEvent) => e.key === "Escape" && setPhase("out");
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(hold);
      window.removeEventListener("keydown", skip);
    };
  }, [phase]);
  useEffect(() => {
    if (phase !== "out") return;
    markSplashSeen();
    const gone = window.setTimeout(() => setPhase("off"), 260);
    return () => window.clearTimeout(gone);
  }, [phase]);
  if (phase === "off") return null;
  return (
    <div
      role="presentation"
      data-splash
      onClick={() => setPhase("out")}
      className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-white"
      style={{ opacity: phase === "out" ? 0 : 1, transition: "opacity 240ms var(--ease-exit)" }}
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <AnimatedMark size={88} mode="reveal" />
        <span className="splash-word">
          <Wordmark className="text-5xl" />
        </span>
      </div>
    </div>
  );
}
