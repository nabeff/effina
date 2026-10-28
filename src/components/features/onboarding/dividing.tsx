"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { draftFlex, draftSplitTotal, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";

/**
 * The pause after the split.
 *
 * Coins arc out of the month and land in the envelopes that
 * claimed them, one envelope at a time, biggest share first. It
 * is the only moment in setup where the answers become a thing
 * that moves, so it is worth the five seconds.
 *
 * The depth is real geometry, not a drawn shadow. Each envelope
 * is a box with a lit top face and a darker right face under one
 * shared light, so the whole row sits on the same ground.
 */

const EASE = [0.32, 0.72, 0, 1] as const;

/** how far the row is tipped away from the viewer */
const TILT = 15;
/** the apparent thickness of a box, in pixels of lid */
const LID = 17;

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

  const biggest = Math.max(...parts.map((p) => p.pct), 1);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    parts.forEach((_, i) => {
      timers.push(setTimeout(() => setAt(i), 620 + i * 540));
    });
    timers.push(setTimeout(onDone, 620 + parts.length * 540 + 1500));

    return () => timers.forEach(clearTimeout);
  }, [parts, onDone]);

  /* what is still unspent, which drains as each envelope fills */
  const spent = parts.slice(0, at + 1).reduce((a, e) => a + e.pct, 0);
  /* the last one takes whatever is left, so the month lands on
     nothing rather than on the rounding */
  const left =
    at >= parts.length - 1
      ? 0
      : Math.max(0, Math.round(flex - (flex * spent) / total));

  return (
    <div className="py-2 text-center select-none">
      {/* the month, which empties as the envelopes fill */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="text-[12.5px] font-semibold tracking-[0.02em] text-muted-foreground">
          Your month
        </div>
        <Counting
          value={left}
          unit={unit}
          className="mt-1.5 text-[42px] leading-none font-bold tracking-[-0.038em] tabular"
        />
      </motion.div>

      {/* the arc, one coin per envelope being filled */}
      <div className="relative mx-auto mt-7 h-[86px] w-full max-w-[520px]">
        {parts.map((e, i) => {
          const live = i === at;
          const x = ((i + 0.5) / parts.length) * 100;
          /* it leaves the middle and swings out to its envelope,
             so the money visibly comes from one place */
          const from = (0.5 - (i + 0.5) / parts.length) * 520;
          return (
            <motion.span
              key={`${e.name}-coin`}
              className="absolute top-0 size-[14px] rounded-full"
              style={{
                left: `${x}%`,
                marginLeft: -7,
                background: `var(--hue-${e.hue})`,
                boxShadow: `0 0 16px color-mix(in srgb, var(--hue-${e.hue}) 55%, transparent)`,
              }}
              initial={{ opacity: 0, x: from, y: -26, scale: 0.4 }}
              animate={
                live
                  ? {
                      opacity: [0, 1, 1, 0],
                      x: [from, from * 0.45, 0, 0],
                      y: [-30, 8, 62, 86],
                      scale: [0.4, 1.1, 1, 0.7],
                    }
                  : { opacity: 0 }
              }
              transition={{
                duration: 0.92,
                ease: [0.34, 0.02, 0.28, 1],
                times: [0, 0.22, 0.8, 1],
              }}
            />
          );
        })}
      </div>

      {/* the envelopes, filling in turn, standing on one ground */}
      <div
        className="relative mx-auto flex w-full max-w-[520px] items-end justify-center gap-4 pt-5"
        style={{ perspective: 900, perspectiveOrigin: "50% 20%" }}
      >
        {parts.map((e, i) => {
          const filled = i <= at;
          const height = Math.round(62 + (e.pct / biggest) * 96);
          return (
            <Box
              key={e.name}
              name={e.name}
              hue={e.hue}
              height={height}
              filled={filled}
              amount={Math.round((flex * e.pct) / total)}
            />
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={
          at >= parts.length - 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }
        }
        transition={{ duration: 0.55, ease: EASE }}
        className="mt-8 text-[14px] text-muted-foreground"
      >
        Every dirham has somewhere to be.
      </motion.p>
    </div>
  );
}

/**
 * One envelope, as a box rather than a bar.
 *
 * Three faces share a single hue, lit from the top left: the lid
 * brightest, the front plain, the right side darkest. The fill
 * rises inside the front face and the lid lights up with it, so
 * the box reads as holding something rather than being painted.
 */
function Box({
  name, hue, height, filled, amount,
}: {
  name: string;
  hue: string;
  height: number;
  filled: boolean;
  amount: number;
}) {
  const c = `var(--hue-${hue})`;

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
      <motion.div
        className="relative w-full"
        style={{
          height,
          transformStyle: "preserve-3d",
          transform: `rotateX(${TILT}deg)`,
        }}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        {/* the lid, which catches the light and brightens when full */}
        <motion.div
          className="absolute inset-x-0 top-0 rounded-[4px]"
          style={{
            height: LID,
            /* it stands on the front face's top edge and lies
               back from there, so the whole lid is visible */
            top: -LID,
            transform: "rotateX(72deg)",
            transformOrigin: "50% 100%",
          }}
          animate={{
            background: filled
              ? `linear-gradient(to bottom, color-mix(in srgb, ${c} 62%, white), color-mix(in srgb, ${c} 95%, white))`
              : "linear-gradient(to bottom, var(--card-2), var(--card))",
          }}
          transition={{ duration: 0.55, delay: filled ? 0.42 : 0, ease: EASE }}
        />

        {/* the right side, the face turned away from the light */}
        <motion.div
          className="absolute top-0 right-0 h-full w-[9px] rounded-[3px]"
          style={{
            transform: "rotateY(58deg)",
            transformOrigin: "0% 50%",
          }}
          animate={{
            background: filled
              ? `color-mix(in srgb, ${c} 58%, black)`
              : "var(--card)",
          }}
          transition={{ duration: 0.55, delay: filled ? 0.42 : 0, ease: EASE }}
        />

        {/* the front, where the money actually rises */}
        <div
          className="relative h-full w-full overflow-hidden rounded-[6px] border border-white/[0.06] bg-fill-2"
          style={{
            boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.05)",
          }}
        >
          <motion.span
            className="absolute inset-x-0 bottom-0 block"
            style={{
              background: `linear-gradient(to bottom, color-mix(in srgb, ${c} 88%, white) 0%, ${c} 42%, color-mix(in srgb, ${c} 78%, black) 100%)`,
            }}
            initial={{ height: "0%" }}
            animate={{ height: filled ? "100%" : "0%" }}
            transition={{ duration: 0.66, delay: filled ? 0.4 : 0, ease: EASE }}
          />
        </div>

        {/* the glow it throws on the ground once it is full */}
        <motion.div
          className="pointer-events-none absolute inset-x-[-18%] bottom-[-14px] h-[22px] rounded-[50%] blur-[9px]"
          style={{ background: c }}
          animate={{ opacity: filled ? 0.32 : 0 }}
          transition={{ duration: 0.6, delay: filled ? 0.45 : 0 }}
        />
      </motion.div>

      <motion.span
        className="w-full text-[11.5px] leading-tight"
        animate={{ opacity: filled ? 1 : 0.32 }}
        transition={{ duration: 0.4, delay: filled ? 0.48 : 0 }}
      >
        <span className="block text-[11.5px] leading-tight text-muted-foreground text-balance">
          {name}
        </span>
        <span className="mt-0.5 block text-[13px] font-semibold text-foreground tabular">
          {filled ? <Counting value={amount} /> : 0}
        </span>
      </motion.span>
    </div>
  );
}

/** A figure that rolls to its value instead of appearing at it. */
function Counting({
  value, unit, className,
}: {
  value: number;
  unit?: string;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 90, damping: 20, mass: 0.6 });
  const text = useTransform(spring, (n) =>
    unit ? money(Math.round(n), unit) : String(Math.round(n)),
  );

  useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
