"use client";

/**
 * A figure that counts from where it was to where it should be.
 *
 * Jumping straight to a new value reads as the page correcting
 * itself. Counting reads as money moving, which is what actually
 * happened.
 */

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { money0 } from "@/lib/utils/money";

interface MoneyProps {
  value: number;
  /** an empty string renders a bare count, for things that are not money */
  currency?: string;
  className?: string;
  unitClassName?: string;
  /** first paint counts from zero, an update counts from the last value */
  animate?: boolean;
  duration?: number;
}

export function Money({
  value,
  currency = "DH",
  className,
  unitClassName,
  animate = true,
  duration = 520,
}: MoneyProps) {
  /* shown is where the count is now, start is where this run of
     the animation began. Both are state rather than refs because
     the render reads them, and React's own pattern for deriving
     from a changed prop is to keep the previous one in state. */
  const [shown, setShown] = useState(value);
  const [start, setStart] = useState(value);
  const [prev, setPrev] = useState(value);
  const frame = useRef<number>(undefined);

  if (prev !== value) {
    setPrev(value);
    /* with animation off there is nothing to count from, so the
       new value is simply what we show */
    setStart(animate ? shown : value);
    if (!animate) setShown(value);
  }

  useEffect(() => {
    if (!animate) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();

    /* someone who asked for less motion gets the figure on the
       next frame rather than counted up to */
    if (reduce || Math.abs(value - start) < 1) {
      frame.current = requestAnimationFrame(() => setShown(value));
      return () => {
        if (frame.current) cancelAnimationFrame(frame.current);
      };
    }

    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) frame.current = requestAnimationFrame(step);
    };

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, start, animate, duration]);

  return (
    <span className={cn("tabular", className)}>
      {money0(shown)}
      {currency ? (
        <span
          className={cn(
            /* a percent sign belongs against its number, a currency
               name reads as a separate word */
            currency === "%" ? "text-[0.72em] font-normal" : "ml-1 text-[0.62em] font-normal text-muted-foreground",
            unitClassName,
          )}
        >
          {currency}
        </span>
      ) : null}
    </span>
  );
}
