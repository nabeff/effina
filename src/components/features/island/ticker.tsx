"use client";

import { useEffect } from "react";
import {
  AnimatePresence, motion, useMotionValue, useReducedMotion,
  useSpring, useTransform,
} from "framer-motion";
import type { Line } from "@/lib/budget";

/**
 * The island's one line, as a ticker.
 *
 * A changed line slides up and out while the new one rises into
 * its place, the way a split flap board turns over. A figure
 * inside it counts rather than cutting, because a number that
 * jumps from 180 to 60 reads as a different fact and a number
 * that travels reads as the same fact changing.
 */

const EASE = [0.32, 0.72, 0, 1] as const;

export function Ticker({ line }: { line: Line }) {
  const still = useReducedMotion();

  return (
    <span className="relative block overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={line.id}
          initial={still ? false : { y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={still ? { opacity: 0 } : { y: -14, opacity: 0 }}
          transition={{ duration: 0.34, ease: EASE }}
          className="block text-[12.5px] leading-none font-medium whitespace-nowrap"
        >
          {line.value !== undefined ? (
            <>
              {line.prefix}
              <Counting value={line.value} still={still} />
              {line.suffix}
            </>
          ) : (
            line.text
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** A figure that travels to its new value rather than jumping. */
function Counting({
  value, still,
}: {
  value: number;
  still: boolean | null;
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 90, damping: 22, mass: 0.7 });
  const text = useTransform(spring, (n) =>
    Math.round(n).toLocaleString("en-US"),
  );

  useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  if (still) return <>{value.toLocaleString("en-US")}</>;
  return <motion.span className="tabular">{text}</motion.span>;
}
