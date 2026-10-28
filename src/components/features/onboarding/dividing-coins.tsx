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

      <div className="relative mx-auto mt-10 w-full max-w-[520px]">
        <div className="flex items-end justify-center gap-4">
        {parts.map((e, i) => (
          <Jar
            key={e.name}
            name={e.name}
            hue={e.hue}
            /* three to seven coins, by share */
            coins={Math.max(5, Math.round((e.pct / biggest) * 11))}
            share={e.pct / biggest}
            pouring={i === at}
            done={i < at}
            amount={Math.round((flex * e.pct) / total)}
          />
          ))}
        </div>

        {/* the shelf they stand on, so nothing floats */}
        <div className="mt-[-1px] h-px w-full bg-gradient-to-r from-transparent via-white/[0.14] to-transparent" />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: at >= parts.length - 1 ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12 text-[14px] text-muted-foreground"
      >
        Every dirham has somewhere to be.
      </motion.p>
    </div>
  );
}

const JAR_H = 108;
const COIN = 34;

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
  const fillTo = Math.round(JAR_H * (0.3 + share * 0.46));

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5">
      <div className="relative w-full" style={{ height: JAR_H + 22 }}>
        {/* the glass */}
        <div
          className="absolute inset-x-0 bottom-0 overflow-hidden rounded-b-[14px] border-x border-b border-white/[0.09]"
          style={{
            height: JAR_H,
            /* glass is brightest at its two edges and almost
               nothing across the middle */
            background:
              "linear-gradient(to right, rgb(255 255 255 / 0.07) 0%, rgb(255 255 255 / 0.008) 20%, rgb(255 255 255 / 0.008) 80%, rgb(255 255 255 / 0.08) 100%)",
            boxShadow: "inset 0 -8px 14px -10px rgb(255 255 255 / 0.3)",
          }}
        >
          {/* the stack, which grows as the coins land */}
          {Array.from({ length: coins }).map((_, n) => {
            /* they pile from the bottom, each row sitting on the
               last, with a little scatter so it is not a grid */
            /* the pile reaches as high as the share deserves,
               so a jar visibly fills rather than keeping a few
               coins at the bottom of a tall glass */
            const step = Math.min(COIN * 0.21, (fillTo - 8) / Math.max(1, coins - 1));
            const bottom = 6 + n * step;
            /* each one sits a hair off the last, the way a real
               stack never lines up perfectly */
            const lean = ((n % 3) - 1) * 1.6;
            return (
              <motion.span
                key={n}
                className="absolute left-1/2 rounded-full"
                style={{
                  width: COIN,
                  height: COIN * 0.3,
                  marginLeft: -COIN / 2,
                  /* edge, face and a lit top, so it reads as a
                     struck disc seen nearly side on */
                  background: `linear-gradient(to bottom, color-mix(in srgb, ${c} 38%, white) 0%, ${c} 38%, color-mix(in srgb, ${c} 55%, black) 72%, color-mix(in srgb, ${c} 30%, black) 100%)`,
                  boxShadow: `0 1px 1px rgb(0 0 0 / 0.55), inset 0 0.5px 0 rgb(255 255 255 / 0.45)`,
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

        {/* the rim, so the glass reads as open at the top */}
        <div
          className="pointer-events-none absolute inset-x-0 h-px"
          style={{
            bottom: JAR_H,
            background:
              "linear-gradient(to right, transparent, rgb(255 255 255 / 0.3) 18%, rgb(255 255 255 / 0.3) 82%, transparent)",
          }}
        />

        {/* the glow under a jar that has something in it */}
        <motion.div
          className="pointer-events-none absolute inset-x-[-20%] bottom-[-10px] h-[20px] rounded-[50%] blur-[10px]"
          style={{ background: c }}
          animate={{ opacity: show ? 0.3 : 0 }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <motion.span
        className="w-full pt-1 text-[11.5px] leading-tight"
        animate={{ opacity: show ? 1 : 0.3 }}
        transition={{ duration: 0.4, delay: show ? 0.3 : 0 }}
      >
        <span className="block text-[11.5px] leading-tight text-muted-foreground text-balance">
          {name}
        </span>
        <span className="mt-0.5 block text-[13.5px] font-semibold text-foreground tabular">
          {show ? amount : 0}
        </span>
      </motion.span>
    </div>
  );
}
