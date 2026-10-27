"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mark } from "@/components/ui/mark";

/* The pool opens from nothing rather than from everything. It
   used to start at full width, so the first frame of the screen
   was the whole mark at once before it closed, which read as a
   flash. */
const RADIUS = 150;
const START_RADIUS = 0;

/**
 * The envelope mark behind the setup wizard, revealed around the
 * cursor.
 *
 * A flat logo on the background would be wallpaper. Lighting only
 * the part you are looking at makes the screen feel like a place
 * rather than a form.
 */
export function Spotlight() {
  const [pointer, setPointer] = useState(false);
  const mouse = useRef({ x: 0, y: 0 });
  const smooth = useRef({ x: 0, y: 0 });
  const radius = useRef(START_RADIUS);
  const frame = useRef(0);
  const host = useRef<HTMLDivElement>(null);

  const onMove = useCallback((e: MouseEvent) => {
    mouse.current = { x: e.clientX, y: e.clientY };
    setPointer(true);
  }, []);

  useEffect(() => {
    /* centre it before the first move, so the entrance is lit */
    smooth.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    mouse.current = { ...smooth.current };

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [onMove]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      smooth.current.x += (mouse.current.x - smooth.current.x) * 0.08;
      smooth.current.y += (mouse.current.y - smooth.current.y) * 0.08;

      /* with no pointer there is nothing to follow, so the mark
         stays open rather than closing on an arbitrary point */
      /* with no pointer there is nothing to follow, so the pool
         rests wide rather than closing on an arbitrary point */
      const target = pointer && !reduce ? RADIUS : RADIUS * 1.2;
      radius.current += (target - radius.current) * 0.06;

      if (host.current) {
        const { x, y } = smooth.current;
        const r = Math.round(radius.current);
        /* the fade ends short of the edge, or the half lit pixels
           read as a grey ring on a near black ground */
        const mask = `radial-gradient(circle ${r}px at ${x}px ${y}px, black 0%, black ${Math.round(r * 0.55)}px, transparent ${Math.round(r * 0.98)}px)`;
        host.current.style.maskImage = mask;
        host.current.style.webkitMaskImage = mask;
      }

      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [pointer]);

  return (
    <>
      {/* only what the cursor is over. A second always lit layer
          showed the whole mark, which defeats the point. */}
      <div
        ref={host}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 grid place-items-center"
      >
        {/* soft and a touch smaller, so it reads as a ground
            rather than a graphic sitting behind the words */}
        <Mark className="h-[min(58vh,58vw)] w-[min(58vh,58vw)] text-primary opacity-[0.14] blur-[1.5px]" />
      </div>
    </>
  );
}
