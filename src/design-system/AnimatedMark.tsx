/* The logo mark with motion. Same geometry as LogoMark.
   reveal: the three bars rise from the mirror line, then the reflection answers below (about 1s).
   loop:   the bars breathe like a level meter while real work happens; the reflection mirrors them.
   static: the final mark, used for reduced motion. */
import { useEffect, useRef } from "react";
import { MARK_AXIS, MARK_BARS, MARK_GAP } from "./Logo";
import { prefersReducedMotion } from "./motion";

type Mode = "reveal" | "loop" | "static";

export function AnimatedMark({ size = 96, mode = "reveal", onDone }: { size?: number; mode?: Mode; onDone?: () => void }) {
  const bars = useRef<(SVGRectElement | null)[]>([]);
  const reflections = useRef<(SVGRectElement | null)[]>([]);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const up = bars.current.filter(Boolean) as SVGRectElement[];
    const down = reflections.current.filter(Boolean) as SVGRectElement[];
    if (mode === "static" || prefersReducedMotion()) {
      done.current?.();
      return;
    }
    let tl: { kill: () => void } | undefined;
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      gsap.set(up, { transformBox: "fill-box", transformOrigin: "50% 100%" });
      gsap.set(down, { transformBox: "fill-box", transformOrigin: "50% 0%" });
      if (mode === "reveal") {
        gsap.set(up, { scaleY: 0 });
        gsap.set(down, { scaleY: 0, opacity: 0 });
        const t = gsap.timeline({ onComplete: () => done.current?.() });
        t.to(up, { scaleY: 1, duration: 0.5, ease: "power3.out", stagger: 0.09 }, 0.08)
          .to(down, { scaleY: 1, opacity: 0.9, duration: 0.45, ease: "power2.out", stagger: 0.09 }, 0.45);
        tl = t;
      } else {
        const t = gsap.timeline({ repeat: -1, yoyo: true });
        t.fromTo(up, { scaleY: 0.45 }, { scaleY: 1, duration: 0.7, ease: "sine.inOut", stagger: 0.14 }, 0)
          .fromTo(down, { scaleY: 1 }, { scaleY: 0.45, duration: 0.7, ease: "sine.inOut", stagger: 0.14 }, 0);
        tl = t;
      }
    });
    return () => {
      cancelled = true;
      tl?.kill();
    };
  }, [mode]);

  const top = MARK_AXIS - MARK_GAP;
  const bottom = MARK_AXIS + MARK_GAP;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ overflow: "visible" }}>
      {MARK_BARS.map((b, i) => (
        <g key={b.x}>
          <rect ref={(el) => { bars.current[i] = el; }} x={b.x} y={top - b.h} width="8" height={b.h} rx="3" fill="var(--color-ink)" />
          <rect ref={(el) => { reflections.current[i] = el; }} x={b.x} y={bottom} width="8" height={b.h} rx="3" fill="var(--color-orange)" opacity="0.9" />
        </g>
      ))}
    </svg>
  );
}
