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

  const done = at >= parts.length - 1;

  return (
    <div className="py-4 text-center select-none">
      {/* while it runs this counts down, but it must not finish
          on nothing. Zero left is the good outcome here, so the
          end says the money is placed rather than gone. */}
      <motion.div
        key={done ? "done" : "running"}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="text-[12.5px] font-semibold tracking-[0.02em] text-muted-foreground">
          {done ? "All of it, placed" : "Still to place"}
        </div>
        <div className="mt-1.5 text-[40px] leading-none font-bold tracking-[-0.038em] tabular">
          {money(done ? flex : left, unit)}
        </div>
      </motion.div>

      <div className="relative mx-auto mt-10 w-full max-w-[520px]">
        <div className="flex items-end justify-center gap-4">
        {parts.map((e, i) => (
          <Jar
            key={e.name}
            name={e.name}
            hue={e.hue}
            /* three to seven coins, by share */
            coins={Math.max(7, Math.round((e.pct / biggest) * 15))}
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
const COIN = 32;
/** the ellipse of the face, seen from slightly above */
const FACE = 9;
/** how thick the disc is */
const THICK = 4;

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
          className="absolute inset-x-0 bottom-0 overflow-hidden rounded-b-[18px]"
          style={{
            height: JAR_H,
            /* no border. Glass shows itself as two bright
               vertical edges where you look through the most
               material, and almost nothing across the face. */
            background:
              "linear-gradient(to right, rgb(255 255 255 / 0.1) 0px, rgb(255 255 255 / 0.028) 3px, rgb(255 255 255 / 0.006) 16%, rgb(255 255 255 / 0.006) 84%, rgb(255 255 255 / 0.032) calc(100% - 3px), rgb(255 255 255 / 0.11) 100%)",
          }}
        >
          {/* the stack, which grows as the coins land */}
          {Array.from({ length: coins }).map((_, n) => {
            /* the pile reaches as high as the share deserves,
               so a jar visibly fills rather than keeping a few
               coins at the bottom of a tall glass */
            const step = Math.min(THICK + 0.5, (fillTo - 10) / Math.max(1, coins - 1));
            const bottom = 3 + n * step;
            /* each one sits a hair off the last, the way a real
               stack never lines up perfectly */
            const lean = ((n % 3) - 1) * 1.4;
            return (
              <motion.span
                key={n}
                className="absolute left-1/2 block"
                style={{
                  width: COIN,
                  height: FACE + THICK,
                  marginLeft: -COIN / 2,
                }}
                initial={{ opacity: 0, y: -JAR_H - 50, x: lean * 2.5, rotate: -16 }}
                animate={
                  show
                    ? { opacity: 1, bottom, y: 0, x: lean, rotate: 0 }
                    : { opacity: 0, y: -JAR_H - 50, x: lean * 2.5, rotate: -16 }
                }
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 18,
                  mass: 0.75,
                  delay: show && pouring ? n * 0.05 : 0,
                }}
              >
                {/* the edge, the band you see between two faces.
                    It is what separates one coin from the next,
                    so it is darker than either face. */}
                <span
                  className="absolute inset-x-0"
                  style={{
                    top: FACE / 2,
                    height: THICK,
                    borderRadius: `0 0 ${COIN / 2}px ${COIN / 2}px / 0 0 ${FACE / 2}px ${FACE / 2}px`,
                    background: `linear-gradient(to right, color-mix(in srgb, ${c} 22%, black) 0%, color-mix(in srgb, ${c} 58%, black) 22%, color-mix(in srgb, ${c} 92%, white) 46%, color-mix(in srgb, ${c} 62%, black) 74%, color-mix(in srgb, ${c} 18%, black) 100%)`,
                  }}
                />
                {/* the top face, an ellipse because that is what
                    a disc looks like from slightly above */}
                <span
                  className="absolute inset-x-0 top-0 block rounded-[50%]"
                  style={{
                    height: FACE,
                    background: `radial-gradient(ellipse 62% 115% at 34% 22%, color-mix(in srgb, ${c} 18%, white) 0%, ${c} 48%, color-mix(in srgb, ${c} 52%, black) 100%)`,
                    boxShadow: `inset 0 -0.5px 1px color-mix(in srgb, ${c} 40%, black), inset 0 0.5px 0 color-mix(in srgb, ${c} 35%, white)`,
                  }}
                />
              </motion.span>
            );
          })}
        </div>

        {/* the rim. An ellipse, not a line, because the glass
            is open and seen from slightly above. */}
        <div
          className="pointer-events-none absolute inset-x-0 rounded-[50%]"
          style={{
            bottom: JAR_H - 4,
            height: 8,
            border: "1px solid rgb(255 255 255 / 0.17)",
            borderBottomColor: "rgb(255 255 255 / 0.28)",
          }}
        />

        {/* the thick base it stands on */}
        <div
          className="pointer-events-none absolute inset-x-[3%] bottom-0 rounded-b-[16px]"
          style={{
            height: 9,
            background:
              "linear-gradient(to bottom, transparent, rgb(255 255 255 / 0.07))",
          }}
        />

        {/* what the coins throw on the shelf. A pool directly
            under the glass, not a halo around it. */}
        <motion.div
          className="pointer-events-none absolute inset-x-[6%] bottom-[-4px] h-[10px] rounded-[50%] blur-[7px]"
          style={{ background: c }}
          animate={{ opacity: show ? 0.22 : 0 }}
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
