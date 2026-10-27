"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* The mark starts fully lit during the entrance, then settles to
   a pool around the cursor. On a touch screen there is no cursor,
   so it simply stays lit and slowly drifts. */
const RADIUS = 420;
const START_RADIUS = 2400;

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
      const target = pointer && !reduce ? RADIUS : START_RADIUS;
      radius.current += (target - radius.current) * 0.025;

      if (host.current) {
        const { x, y } = smooth.current;
        const r = Math.round(radius.current);
        /* the fade ends short of the edge, or the half lit pixels
           read as a grey ring on a near black ground */
        const mask = `radial-gradient(circle ${r}px at ${x}px ${y}px, black 0%, black ${Math.round(r * 0.62)}px, transparent ${Math.round(r * 0.95)}px)`;
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
      {/* always lit, so the screen is signed even on a wide
          display where the cursor sits far from the card */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 grid place-items-center">
        <Mark className="opacity-[0.045]" />
      </div>

      {/* and brighter where you are actually looking */}
      <div
        ref={host}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 grid place-items-center"
      >
        <Mark className="opacity-[0.11]" />
      </div>
    </>
  );
}

function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={`h-[min(135vh,135vw)] w-[min(135vh,135vw)] ${className ?? ""}`}
    >
      <rect
        x="86" y="150" width="340" height="232" rx="34"
        fill="none" stroke="var(--primary)" strokeWidth="18"
      />
      <path
        d="M86 184 L256 300 L426 184"
        fill="none" stroke="var(--primary)" strokeWidth="18"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
