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
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef<number>(undefined);

  useEffect(() => {
    if (!animate) {
      setShown(value);
      return;
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;

    if (reduce || Math.abs(value - start) < 1) {
      from.current = value;
      setShown(value);
      return;
    }

    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * eased);
      if (p < 1) frame.current = requestAnimationFrame(step);
      else from.current = value;
    };

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, animate, duration]);

  return (
    <span className={cn("tabular", className)}>
      {money0(shown)}
      {currency ? (
        <span className={cn("ml-1 text-[0.62em] font-normal text-muted-foreground", unitClassName)}>
          {currency}
        </span>
      ) : null}
    </span>
  );
}
