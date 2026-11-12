/* The loading screen's backdrop: a faint grid with thin lines of light that glide across it.
   Purely atmosphere: no text, no numbers, no interaction. Each streak runs along a grid line and fades in and out at its
   ends. Only transform and opacity animate (cheap), the speeds are different so it never repeats in step, and reduced
   motion leaves the quiet grid without the streaks. */

type Streak = { axis: "x" | "y"; line: number; len: number; dur: number; delay: number; tone: "orange" | "white" };

/* `line` is which grid line it travels on (64px apart). Negative delays mean the motion is already under way at load. */
const STREAKS: Streak[] = [
  { axis: "x", line: 2, len: 340, dur: 17, delay: -4, tone: "orange" },
  { axis: "x", line: 4, len: 220, dur: 13, delay: -9, tone: "white" },
  { axis: "x", line: 6, len: 420, dur: 21, delay: -2, tone: "orange" },
  { axis: "x", line: 9, len: 260, dur: 15, delay: -12, tone: "white" },
  { axis: "x", line: 11, len: 360, dur: 19, delay: -7, tone: "orange" },
  { axis: "x", line: 13, len: 200, dur: 12, delay: -3, tone: "white" },
  { axis: "y", line: 3, len: 300, dur: 16, delay: -6, tone: "white" },
  { axis: "y", line: 7, len: 420, dur: 22, delay: -11, tone: "orange" },
  { axis: "y", line: 11, len: 260, dur: 14, delay: -2, tone: "orange" },
  { axis: "y", line: 15, len: 360, dur: 20, delay: -8, tone: "white" },
  { axis: "y", line: 19, len: 240, dur: 13, delay: -5, tone: "orange" },
];

/* Soft pools, as percentages of the screen. Each one refracts and blurs the grid under it, and drifts slowly. */
const POOLS = [
  { left: 4, top: 14, size: 380, drift: 9, delay: 0 },
  { left: 60, top: 2, size: 320, drift: 11, delay: -3 },
  { left: 74, top: 52, size: 440, drift: 10, delay: -6 },
  { left: 24, top: 62, size: 360, drift: 12, delay: -2 },
];

/** `speed` multiplies how fast the lines run: 1 is a slow drift, higher suits a short moment like the loading screen. */
export default function LineFlow({ speed = 1 }: { speed?: number }) {
  return (
    <div aria-hidden="true" data-lineflow className="line-flow">
      <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
        <filter id="lineflow-water" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="38" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="line-flow__grid" />
      {POOLS.map((p, i) => (
        <span
          key={`pool-${i}`}
          data-water-area
          className="water-area"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            ["--size" as string]: `${p.size}px`,
            ["--drift" as string]: `${(p.drift / Math.max(1, speed / 2)).toFixed(1)}s`,
            ["--delay" as string]: `${p.delay}s`,
          }}
        />
      ))}
      {STREAKS.map((s, i) => (
        <span
          key={i}
          className={`streak streak-${s.axis} streak-${s.tone}`}
          style={{
            ["--len" as string]: `${s.len}px`,
            ["--dur" as string]: `${(s.dur / speed).toFixed(2)}s`,
            ["--delay" as string]: `${(s.delay / speed).toFixed(2)}s`,
            [s.axis === "x" ? "top" : "left"]: `${s.line * 64}px`,
          }}
        />
      ))}
    </div>
  );
}
