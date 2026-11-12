/* Scroll edges: a water lens plus progressive blur, fixed to the top and bottom of the screen.
   The lens magnifies and ripples whatever slides under the edge (an SVG displacement map: strongest at the edge, fading to
   nothing inward, with a slow wobble of water on top). Browsers that cannot use SVG filters as a backdrop keep the blur only.
   As you scroll, text slides under these two bands and softens as it leaves or arrives, so you can see the effect
   working on the content itself (instead of blurring titles). Five stacked layers give a smooth ramp from sharp to soft.
   The top band appears once you have scrolled; the bottom band steps aside when you reach the end of the page.
   Decorative: hidden from assistive technology and never blocks the pointer. */
import { useEffect } from "react";

const LAYERS = [
  { blur: 0.6, reach: 100 },
  { blur: 1.6, reach: 78 },
  { blur: 3.2, reach: 58 },
  { blur: 6, reach: 40 },
  { blur: 10, reach: 24 },
];

/* Displacement map for the magnifier: G channel pushes sampling inward, 255 at the edge easing to neutral 128 inside.
   Sampling slows down toward the edge, so the content there is stretched: a convex lens. */
function lensMap(edge: "top" | "bottom") {
  const stops = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1].map((t) => {
    const g = Math.round(128 + 127 * (1 - t) ** 2);
    const at = edge === "top" ? t : 1 - t;
    return `<stop offset="${(at * 100).toFixed(0)}%" stop-color="rgb(128,${g},128)"/>`;
  });
  const ordered = edge === "top" ? stops : stops.reverse();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="112" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${ordered.join("")}</linearGradient></defs><rect width="400" height="112" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function WaterFilters() {
  const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute" }}>
      {(["top", "bottom"] as const).map((edge) => (
        <filter key={edge} id={`edge-water-${edge}`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage href={lensMap(edge)} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="lens" />
          <feTurbulence type="fractalNoise" baseFrequency="0.0022 0.011" numOctaves="1" seed={edge === "top" ? 4 : 9} result="noise">
            {!calm && <animate attributeName="baseFrequency" dur="14s" repeatCount="indefinite" values="0.0022 0.011;0.0032 0.015;0.0022 0.011" />}
          </feTurbulence>
          <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 0 0 0.5  0 0 0 0 1" result="wave" />
          <feComposite in="lens" in2="wave" operator="arithmetic" k1="0" k2="0.86" k3="0.14" k4="0" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="46" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      ))}
    </svg>
  );
}

function Band({ edge }: { edge: "top" | "bottom" }) {
  const dir = edge === "top" ? "to bottom" : "to top";
  const fade = `linear-gradient(${dir}, #000 0%, #000 72%, transparent 100%)`;
  return (
    <div aria-hidden="true" data-edge-blur={edge} className={`edge-blur edge-blur--${edge}`}>
      <i
        data-water
        style={{ backdropFilter: `url(#edge-water-${edge})`, WebkitBackdropFilter: `url(#edge-water-${edge})`, maskImage: fade, WebkitMaskImage: fade }}
      />
      {LAYERS.map((l, i) => (
        <i
          key={i}
          style={{
            backdropFilter: `blur(${l.blur}px)`,
            WebkitBackdropFilter: `blur(${l.blur}px)`,
            maskImage: `linear-gradient(${dir}, #000 0%, #000 ${l.reach * 0.35}%, transparent ${l.reach}%)`,
            WebkitMaskImage: `linear-gradient(${dir}, #000 0%, #000 ${l.reach * 0.35}%, transparent ${l.reach}%)`,
          }}
        />
      ))}
    </div>
  );
}

export default function EdgeBlur() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const end = document.documentElement.scrollHeight - window.innerHeight;
      root.toggleAttribute("data-scrolled", y > 24);
      root.toggleAttribute("data-at-end", end > 0 && y >= end - 24);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
      root.removeAttribute("data-scrolled");
      root.removeAttribute("data-at-end");
    };
  }, []);
  return (
    <>
      <WaterFilters />
      <Band edge="top" />
      <Band edge="bottom" />
    </>
  );
}
