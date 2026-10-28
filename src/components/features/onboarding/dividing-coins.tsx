"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { draftFlex, draftSplitTotal, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";

/**
 * Three, the coins.
 *
 * Money falls with weight. Several coins per area, each one
 * thrown slightly differently, landing and stacking rather than
 * a bar changing height. The jars are glass, so the stack is
 * visible through the front.
 *
 * The number of coins follows the share, so the biggest area
 * visibly gets the most without anybody reading a figure.
 */

const EASE = [0.32, 0.72, 0, 1] as const;
/** how long one area's handful takes to land */
const PER_AREA = 620;

export function DividingCoins({
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
        .slice(0, 5),
    [draft.split],
  );

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
      timers.push(setTimeout(() => setAt(i), 560 + i * PER_AREA));
    });
    timers.push(setTimeout(onDone, 560 + parts.length * PER_AREA + 1500));
    return () => timers.forEach(clearTimeout);
  }, [parts, onDone]);

  const spent = parts.slice(0, at + 1).reduce((a, e) => a + e.pct, 0);
  const left =
    at >= parts.length - 1 ? 0 : Math.round(flex - (flex * spent) / total);

  return (
    <div className="py-4 text-center select-none">
      <div className="text-[12.5px] font-semibold tracking-[0.02em] text-muted-foreground">
        Your month
      </div>
      <div className="mt-1.5 text-[40px] leading-none font-bold tracking-[-0.038em] tabular">
        {money(left, unit)}
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-[460px] items-end justify-center gap-3.5">
        {parts.map((e, i) => (
          <Jar
            key={e.name}
            name={e.name}
            hue={e.hue}
            /* three to seven coins, by share */
            coins={Math.max(4, Math.round((e.pct / biggest) * 9))}
            share={e.pct / biggest}
            pouring={i === at}
            done={i < at}
            amount={Math.round((flex * e.pct) / total)}
          />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: at >= parts.length - 1 ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-10 text-[14px] text-muted-foreground"
      >
        Every dirham has somewhere to be.
      </motion.p>
    </div>
  );
}

const JAR_H = 104;
const COIN = 15;

function Jar({
  name, hue, coins, share, pouring, done, amount,
}: {
  name: string;
  hue: string;
  coins: number;
  /** how full this jar should end up, 0 to 1 */
  share: number;
  pouring: boolean;
  done: boolean;
  amount: number;
}) {
  const c = `var(--hue-${hue})`;
  const show = pouring || done;
  const fillTo = Math.round(JAR_H * (0.42 + share * 0.5));

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
      <div className="relative w-full" style={{ height: JAR_H + 30 }}>
        {/* the glass */}
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden rounded-t-[4px] rounded-b-[11px] border border-white/[0.09] border-t-transparent"
          style={{
            height: JAR_H,
            background:
              "linear-gradient(to right, rgb(255 255 255 / 0.05), rgb(255 255 255 / 0.015) 30%, rgb(255 255 255 / 0.015) 70%, rgb(255 255 255 / 0.06))",
          }}
        >
          {/* the stack, which grows as the coins land */}
          {Array.from({ length: coins }).map((_, n) => {
            /* they pile from the bottom, each row sitting on the
               last, with a little scatter so it is not a grid */
            /* the pile reaches as high as the share deserves,
               so a jar visibly fills rather than keeping a few
               coins at the bottom of a tall glass */
            const rows = Math.ceil(coins / 2);
            const step = Math.min(COIN * 0.66, (fillTo - 10) / Math.max(1, rows - 1));
            const row = Math.floor(n / 2);
            const bottom = 8 + row * step;
            const lean = (n % 2 === 0 ? -1 : 1) * (5 + (n % 3) * 3);
            return (
              <motion.span
                key={n}
                className="absolute left-1/2 rounded-full"
                style={{
                  width: COIN,
                  height: COIN * 0.72,
                  marginLeft: -COIN / 2,
                  background: `linear-gradient(to bottom, color-mix(in srgb, ${c} 55%, white), ${c} 55%, color-mix(in srgb, ${c} 70%, black))`,
                  boxShadow: `0 1px 2px rgb(0 0 0 / 0.45)`,
                }}
                initial={{ opacity: 0, y: -JAR_H - 40, x: lean * 2, rotate: -22 }}
                animate={
                  show
                    ? { opacity: 1, bottom, y: 0, x: lean, rotate: lean * 0.5 }
                    : { opacity: 0, y: -JAR_H - 40, x: lean * 2, rotate: -22 }
                }
                transition={{
                  type: "spring",
                  stiffness: 240,
                  damping: 17,
                  mass: 0.8,
                  delay: show && pouring ? n * 0.055 : 0,
                }}
              />
            );
          })}
        </div>

        {/* the glow under a jar that has something in it */}
        <motion.div
          className="pointer-events-none absolute inset-x-[-20%] bottom-[-10px] h-[20px] rounded-[50%] blur-[10px]"
          style={{ background: c }}
          animate={{ opacity: show ? 0.3 : 0 }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <motion.span
        className="w-full text-[11.5px] leading-tight"
        animate={{ opacity: show ? 1 : 0.32 }}
        transition={{ duration: 0.4, delay: show ? 0.3 : 0 }}
      >
        <span className="block text-muted-foreground text-balance">{name}</span>
        <span className="mt-0.5 block text-[13px] font-semibold text-foreground tabular">
          {show ? amount : 0}
        </span>
      </motion.span>
    </div>
  );
}
