/* Scroll edges: soft, progressive blur fixed to the top and bottom of the screen.
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

function Band({ edge }: { edge: "top" | "bottom" }) {
  const dir = edge === "top" ? "to bottom" : "to top";
  return (
    <div aria-hidden="true" data-edge-blur={edge} className={`edge-blur edge-blur--${edge}`}>
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
      <Band edge="top" />
      <Band edge="bottom" />
    </>
  );
}
