"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { draftFlex, draftSplitTotal, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";

/**
 * The pause after the split.
 *
 * Coins fall out of the month and land in the envelopes that
 * claimed them, one envelope at a time, biggest share first. It
 * is the only moment in setup where the answers become a thing
 * that moves, so it is worth the four seconds.
 */
export function Dividing({
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

  /* which envelope is being filled right now */
  const [at, setAt] = useState(-1);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    parts.forEach((_, i) => {
      timers.push(setTimeout(() => setAt(i), 500 + i * 520));
    });
    timers.push(setTimeout(onDone, 500 + parts.length * 520 + 1300));

    return () => timers.forEach(clearTimeout);
  }, [parts, onDone]);

  return (
    <div className="py-4 text-center">
      {/* the month, which empties as the envelopes fill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="text-[12.5px] font-semibold tracking-[0.02em] text-muted-foreground">
          Your month
        </div>
        <div className="mt-1 text-[34px] leading-none font-bold tracking-[-0.036em] tabular">
          {money(flex, unit)}
        </div>
      </motion.div>

      {/* the drop, one line per envelope being filled */}
      <div className="relative mx-auto mt-7 mb-8 h-[58px] w-full max-w-[380px]">
        {parts.map((e, i) => {
          const live = i === at;
          const x = ((i + 0.5) / parts.length) * 100;
          return (
            <motion.span
              key={`${e.name}-drop`}
              className="absolute top-0 size-[11px] rounded-full"
              style={{
                left: `${x}%`,
                marginLeft: -5.5,
                background: `var(--hue-${e.hue})`,
              }}
              initial={{ opacity: 0, y: -16, scale: 0.6 }}
              animate={
                live
                  ? { opacity: [0, 1, 1, 0], y: [-16, 10, 44, 58], scale: [0.6, 1, 1, 0.75] }
                  : { opacity: 0 }
              }
              transition={{ duration: 0.86, ease: [0.4, 0, 0.3, 1], times: [0, 0.18, 0.78, 1] }}
            />
          );
        })}
      </div>

      {/* the envelopes, filling in turn */}
      <div className="mx-auto flex w-full max-w-[380px] items-end gap-2">
        {parts.map((e, i) => {
          const filled = i <= at;
          const height = 34 + (e.pct / Math.max(...parts.map((p) => p.pct))) * 54;
          return (
            <div key={e.name} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                className="relative w-full overflow-hidden rounded-[7px] bg-fill-2"
                style={{ height }}
              >
                <motion.span
                  className="absolute inset-x-0 bottom-0 block"
                  style={{ background: `var(--hue-${e.hue})` }}
                  initial={{ height: "0%" }}
                  animate={{ height: filled ? "100%" : "0%" }}
                  transition={{
                    duration: 0.62,
                    delay: filled ? 0.4 : 0,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                />
              </div>

              <motion.span
                className="text-[11px] leading-tight text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: filled ? 1 : 0.3 }}
                transition={{ duration: 0.35, delay: filled ? 0.45 : 0 }}
              >
                <span className="block truncate">{e.name.split(" ")[0]}</span>
                <span className="block font-semibold text-foreground tabular">
                  {Math.round((flex * e.pct) / total)}
                </span>
              </motion.span>
            </div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: at >= parts.length - 1 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="mt-7 text-[14px] text-muted-foreground"
      >
        Every dirham has somewhere to be.
      </motion.p>
    </div>
  );
}
