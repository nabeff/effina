"use client";

import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * The light that travels around the island's edge.
 *
 * An SVG rounded rectangle traced by a short dash, moved around
 * the path by animating the dash offset. A dash follows whatever
 * path it is on, so when the island morphs the light morphs with
 * it, which a masked conic gradient cannot do: a cone has one
 * centre and the shape does not.
 *
 * The streak is drawn three times at falling opacity and rising
 * blur, which is what reads as a head with a tail behind it.
 *
 * The box is measured rather than passed in, so the light is
 * always exactly the shape's size even mid morph.
 */

/** how much of the way round the streak covers */
const SWEEP = 0.15;
/** one lap */
const SECONDS = 14;

const STOPS = [
  { c: "var(--hue-teal)", o: 0.0 },
  { c: "var(--hue-indigo)", o: 0.25 },
  { c: "var(--hue-purple)", o: 0.5 },
  { c: "var(--hue-pink)", o: 0.7 },
  { c: "var(--hue-green)", o: 1 },
];

export function EdgeLight({
  radius = 26,
  of,
}: {
  radius?: number;
  /** the element to trace */
  of: React.RefObject<HTMLElement | null>;
}) {
  const still = useReducedMotion();
  const [box, setBox] = useState({ w: 0, h: 0 });
  /* useId, not random, because the server and the browser must
     agree on it or hydration tears */
  const id = `edge${useId().replace(/:/g, "")}`;

  /* the shape changes size as it morphs, and a resize observer
     reports every frame of that, so the ring is never stale */
  useEffect(() => {
    const el = of.current;
    if (!el) return;
    /* the observer reports the first size itself, so there is
       no need to set it synchronously as well */
    const ro = new ResizeObserver(() => {
      setBox({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [of]);

  if (!box.w || !box.h) return null;

  /* the path length of a rounded rectangle, near enough that the
     dash lands where it looks like it should */
  const perimeter =
    2 * (box.w - radius * 2) + 2 * (box.h - radius) + 2 * Math.PI * radius;
  const dash = perimeter * SWEEP;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={box.w}
      height={box.h}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {STOPS.map((s, i) => (
            <stop key={i} offset={s.o} stopColor={s.c} />
          ))}
        </linearGradient>
      </defs>

      {/* three passes: a soft wide halo, the body, and a bright
          thin core, so the streak has depth rather than being a
          single flat line */}
      {/* At a tenth opacity on black the streak is invisible.
          The halo stays faint so it never reads as an outline,
          but the core is bright enough to be seen as light. */}
      {[
        { w: 9, o: 0.07, blur: 9 },
        { w: 4, o: 0.14, blur: 3.5 },
        { w: 1.8, o: 0.3, blur: 0.8 },
      ].map((pass, i) => (
        <rect
          key={i}
          x={pass.w / 2}
          y={-radius}
          width={box.w - pass.w}
          height={box.h + radius - pass.w / 2}
          rx={radius}
          ry={radius}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={pass.w}
          strokeLinecap="round"
          opacity={pass.o}
          style={{
            filter: pass.blur ? `blur(${pass.blur}px)` : undefined,
            strokeDasharray: `${dash} ${perimeter}`,
          }}
        >
          {!still ? (
            <animate
              attributeName="stroke-dashoffset"
              from={perimeter}
              to="0"
              dur={`${SECONDS}s`}
              repeatCount="indefinite"
            />
          ) : (
            <animate
              attributeName="stroke-dashoffset"
              from={perimeter * 0.3}
              to={perimeter * 0.3}
              dur="1s"
              repeatCount="1"
            />
          )}
        </rect>
      ))}
    </svg>
  );
}
