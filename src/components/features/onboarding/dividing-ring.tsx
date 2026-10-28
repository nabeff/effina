"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { draftFlex, draftSplitTotal, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";

/**
 * Two, the ring.
 *
 * The same ring that sits on the dashboard draws itself, one arc
 * per area, while the figure counts up in the middle. By the
 * time setup ends, the shape has already been met once, so the
 * home page is a place the person recognises rather than a new
 * screen.
 */

const EASE = [0.32, 0.72, 0, 1] as const;

const SIZE = 260;
const STROKE = 26;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
/** the hair of black between one arc and the next */
const GAP = 2.4;

export function DividingRing({
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

  const [at, setAt] = useState(-1);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    parts.forEach((_, i) => {
      timers.push(setTimeout(() => setAt(i), 600 + i * 420));
    });
    timers.push(setTimeout(onDone, 600 + parts.length * 420 + 1600));
    return () => timers.forEach(clearTimeout);
  }, [parts, onDone]);

  /* where each arc starts, so they chase each other round */
  let run = 0;
  const arcs = parts.map((e) => {
    const start = run;
    run += e.pct / total;
    return { ...e, start, frac: e.pct / total };
  });

  const shown = arcs.slice(0, at + 1).reduce((a, e) => a + e.pct, 0);
  const amount = Math.round((flex * shown) / total);

  return (
    <div className="py-4 text-center select-none">
      <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="size-full -rotate-90"
        >
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none"
            stroke="var(--fill-2)"
            strokeWidth={STROKE}
          />
          {/* each arc is one dash on its own circle, grown by
              animating the dash itself. Animating pathLength as
              well would fight the dash array and paint the whole
              ring in the last colour. */}
          {arcs.map((e, i) => {
            const len = Math.max(0, e.frac * C - GAP);
            return (
              <motion.circle
                key={e.name}
                cx={SIZE / 2} cy={SIZE / 2} r={R}
                fill="none"
                stroke={`var(--hue-${e.hue})`}
                strokeWidth={STROKE}
                strokeLinecap="butt"
                strokeDashoffset={-e.start * C}
                initial={{ strokeDasharray: `0 ${C}` }}
                animate={{
                  strokeDasharray:
                    i <= at ? `${len} ${C - len}` : `0 ${C}`,
                }}
                transition={{ duration: 0.6, ease: EASE }}
              />
            );
          })}
        </svg>

        {/* the figure, counting up as the arcs claim it */}
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <div className="text-[12px] font-semibold tracking-[0.02em] text-muted-foreground">
              Your month
            </div>
            <motion.div
              key={amount}
              initial={{ opacity: 0.6, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mt-1 text-[30px] leading-none font-bold tracking-[-0.036em] tabular"
            >
              {money(amount, unit)}
            </motion.div>
          </div>
        </div>
      </div>

      {/* the key, one line per area, arriving with its arc */}
      <div className="mx-auto mt-8 grid w-full max-w-[400px] grid-cols-2 gap-x-6 gap-y-2.5">
        {arcs.map((e, i) => (
          <motion.div
            key={`${e.name}-key`}
            className="flex items-center gap-2.5 text-left"
            initial={{ opacity: 0, x: -6 }}
            animate={i <= at ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <span
              className="size-[9px] flex-none rounded-full"
              style={{ background: `var(--hue-${e.hue})` }}
            />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted-foreground">
              {e.name}
            </span>
            <span className="text-[12.5px] font-semibold tabular">
              {Math.round((flex * e.pct) / total)}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: at >= parts.length - 1 ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-8 text-[14px] text-muted-foreground"
      >
        Every dirham has somewhere to be.
      </motion.p>
    </div>
  );
}
