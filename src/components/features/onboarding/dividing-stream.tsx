"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { draftFlex, draftSplitTotal, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";

/**
 * One, the stream.
 *
 * The month is a single bar. It comes apart into the areas that
 * claimed it, and the pieces slide down into a row. Nothing
 * fills, nothing counts up. The money is never created or
 * destroyed, it only moves, which is the whole idea of the app
 * in one gesture.
 */

const EASE = [0.32, 0.72, 0, 1] as const;

export function DividingStream({
  draft, onDone,
}: {
  draft: Draft;
  onDone: () => void;
}) {
  const flex = draftFlex(draft);
  const unit = draft.currency || "DH";
  const total = draftSplitTotal(draft) || 100;

  const parts = useMemo(
    () =>
      draft.split
        .filter((e) => e.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 6),
    [draft.split],
  );

  /* 0 whole, 1 split apart, 2 settled with labels */
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const timers = [
      setTimeout(() => setPhase(1), 900),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(onDone, 4200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="py-6 text-center select-none">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="text-[12.5px] font-semibold tracking-[0.02em] text-muted-foreground">
          Your month
        </div>
        <div className="mt-1.5 text-[40px] leading-none font-bold tracking-[-0.038em] tabular">
          {money(flex, unit)}
        </div>
      </motion.div>

      {/* the bar, which is one thing and then several */}
      <div className="mx-auto mt-10 w-full max-w-[460px]">
        <motion.div
          className="flex w-full overflow-hidden"
          animate={{ gap: phase >= 1 ? 6 : 0 }}
          transition={{ duration: 0.75, ease: EASE }}
        >
          {parts.map((e, i) => (
            <motion.div
              key={e.name}
              className="h-[46px]"
              style={{
                background: `var(--hue-${e.hue})`,
                flex: `${e.pct} 0 0%`,
              }}
              initial={{ borderRadius: 0 }}
              animate={{
                borderRadius: phase >= 1 ? 10 : 0,
                y: phase >= 2 ? 0 : 0,
              }}
              transition={{
                duration: 0.75,
                ease: EASE,
                delay: phase >= 1 ? i * 0.045 : 0,
              }}
            />
          ))}
        </motion.div>

        {/* the labels arrive under the pieces once they are apart */}
        <div className="mt-3 flex w-full gap-1.5">
          {parts.map((e, i) => (
            <motion.div
              key={`${e.name}-label`}
              className="min-w-0 text-left"
              style={{ flex: `${e.pct} 0 0%` }}
              initial={{ opacity: 0, y: -6 }}
              animate={
                phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }
              }
              transition={{ duration: 0.45, ease: EASE, delay: i * 0.06 }}
            >
              <div className="truncate text-[11px] text-muted-foreground">
                {e.name}
              </div>
              <div className="truncate text-[13px] font-semibold tabular">
                {Math.round((flex * e.pct) / total)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12 text-[14px] text-muted-foreground"
      >
        Every dirham has somewhere to be.
      </motion.p>
    </div>
  );
}
