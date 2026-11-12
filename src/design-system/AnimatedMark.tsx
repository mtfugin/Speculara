/* The logo mark with motion. Same geometry as LogoMark; the two circles and the lens cut-out move together.
   reveal: circles arrive from opposite corners and settle into the lens (once, about 0.8s).
   loop:   circles drift apart and back, "searching, then focusing", for real waiting time (2.4s cycle).
   static: the final mark, used for reduced motion. */
import { useEffect, useId, useRef } from "react";
import { prefersReducedMotion } from "./motion";

type Mode = "reveal" | "loop" | "static";
const FINAL = { a: 19, b: 29 };

export function AnimatedMark({ size = 96, mode = "reveal", onDone }: { size?: number; mode?: Mode; onDone?: () => void }) {
  const id = useId().replace(/:/g, "");
  const group = useRef<SVGGElement>(null);
  const aMain = useRef<SVGCircleElement>(null);
  const aClip = useRef<SVGCircleElement>(null);
  const bMain = useRef<SVGCircleElement>(null);
  const bMask = useRef<SVGCircleElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const aEls = [aMain.current, aClip.current].filter(Boolean) as SVGCircleElement[];
    const bEls = [bMain.current, bMask.current].filter(Boolean) as SVGCircleElement[];
    const place = (offset: number) => {
      for (const el of aEls) {
        el.setAttribute("cx", String(FINAL.a - offset));
        el.setAttribute("cy", String(FINAL.a - offset));
      }
      for (const el of bEls) {
        el.setAttribute("cx", String(FINAL.b + offset));
        el.setAttribute("cy", String(FINAL.b + offset));
      }
    };
    if (mode === "static" || prefersReducedMotion()) {
      place(0);
      done.current?.();
      return;
    }
    let tl: { kill: () => void } | undefined;
    let cancelled = false;
    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const state = { o: mode === "reveal" ? 9 : 3 };
      place(state.o);
      if (mode === "reveal") {
        gsap.set(group.current, { opacity: 0, transformOrigin: "50% 50%" });
        const t = gsap.timeline({ onComplete: () => done.current?.() });
        t.to(group.current, { opacity: 1, duration: 0.2, ease: "power1.out" }, 0)
          .to(state, { o: 0, duration: 0.55, ease: "power3.inOut", onUpdate: () => place(state.o) }, 0.1)
          .to(group.current, { scale: 1.06, duration: 0.14, ease: "power2.out" }, 0.62)
          .to(group.current, { scale: 1, duration: 0.3, ease: "back.out(2.2)" }, 0.76);
        tl = t;
      } else {
        tl = gsap.to(state, { o: 9, duration: 1.2, ease: "sine.inOut", yoyo: true, repeat: -1, onUpdate: () => place(state.o) });
      }
    });
    return () => {
      cancelled = true;
      tl?.kill();
    };
  }, [mode]);

  const a = { cx: FINAL.a, cy: FINAL.a, r: 15 };
  const b = { cx: FINAL.b, cy: FINAL.b, r: 15 };
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false" style={{ overflow: "visible" }}>
      <defs>
        <clipPath id={`${id}c`}>
          <circle ref={aClip} {...a} />
        </clipPath>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="88" height="88">
          <rect x="-20" y="-20" width="88" height="88" fill="white" />
          <g clipPath={`url(#${id}c)`}>
            <circle ref={bMask} {...b} fill="black" />
          </g>
        </mask>
      </defs>
      <g ref={group} mask={`url(#${id}m)`}>
        <circle ref={aMain} {...a} fill="var(--color-ink)" />
        <circle ref={bMain} {...b} fill="var(--color-sky)" />
      </g>
    </svg>
  );
}
