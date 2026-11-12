/* A number whose digits roll like an odometer the first time it scrolls into view.
   The real digits stay in the DOM (invisible, selectable, read by screen readers); the rolling column is drawn by CSS
   (`.roll-digit::before` in index.css), so text search, copy and tests all see the plain number.
   Reduced motion removes the transition, so the final number simply appears. */
import { useEffect, useRef, useState } from "react";

export function RollingNumber({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(false);
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  let digit = 0;
  return (
    <span ref={ref} className={`roll tabular ${on ? "is-in" : ""} ${className}`}>
      {[...value].map((ch, k) =>
        /\d/.test(ch) ? (
          <span key={k} className="roll-digit" style={{ ["--d" as string]: ch, ["--i" as string]: digit++ }}>
            <span className="roll-real">{ch}</span>
          </span>
        ) : (
          <span key={k} className="roll-sep">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}

/** True when a formatted string is a plain number worth rolling (digits, separators, sign, percent).
 *  Very long numbers stay plain text so they can still wrap on narrow screens. */
export const isRollable = (v: unknown): v is string => typeof v === "string" && v.length <= 11 && /^[+-]?[\d.,]+%?$/.test(v) && /\d/.test(v);
