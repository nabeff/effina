"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, useSpring, type MotionValue } from "framer-motion";
import { draftFlex, draftSplitTotal, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";

/**
 * The shape of a month.
 *
 * One arm per area, the way a player's attributes are drawn in a
 * football game. Every budget comes out as a shape nobody else
 * has, and the shape is the point: somebody who saves hard and
 * eats cheap looks nothing like somebody who does the reverse.
 *
 * Flat. No perspective, no glass, no depth.
 *
 * Every arm has its own spring and the outline is rebuilt from
 * their live values each frame. Animating the points attribute
 * directly makes Framer interpolate a string, which is what
 * made the growth look stepped instead of sprung.
 */

const EASE = [0.32, 0.72, 0, 1] as const;

const SIZE = 380;
const MID = SIZE / 2;
/** how far the outer ring sits from the middle */
const MAX_R = 132;
/** the floor, so a small share is still a visible arm */
const MIN_R = 34;
/** soft and slow, so an arm settles rather than snaps */
const SPRING = { stiffness: 80, damping: 20, mass: 1.1 } as const;
/** how long between one arm and the next */
const STEP = 580;
/** the most arms the shape can hold */
const MAX_ARMS = 8;

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
        .slice(0, MAX_ARMS),
    [draft.split],
  );

  /* how many arms have been claimed so far */
  const [at, setAt] = useState(-1);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    parts.forEach((_, i) => {
      timers.push(setTimeout(() => setAt(i), 800 + i * STEP));
    });
    timers.push(setTimeout(onDone, 800 + parts.length * STEP + 1900));
    return () => timers.forEach(clearTimeout);
  }, [parts, onDone]);

  const n = parts.length;
  const biggest = Math.max(...parts.map((p) => p.pct), 1);

  /* straight up for the first arm, then evenly round */
  const point = useCallback(
    (i: number, r: number) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
      return { x: MID + Math.cos(a) * r, y: MID + Math.sin(a) * r };
    },
    [n],
  );

  const targets = useMemo(
    () =>
      Array.from({ length: MAX_ARMS }, (_, i) =>
        parts[i] && i <= at
          ? MIN_R + (parts[i].pct / biggest) * (MAX_R - MIN_R)
          : 0,
      ),
    [parts, at, biggest],
  );

  const arms = useArms(targets);

  return (
    <div className="py-2 text-center select-none">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="text-[12.5px] font-semibold tracking-[0.02em] text-muted-foreground">
          Your month
        </div>
        <div className="mt-1.5 text-[38px] leading-none font-bold tracking-[-0.038em] tabular">
          {money(flex, unit)}
        </div>
      </motion.div>

      <div className="relative mx-auto mt-4" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full overflow-visible">
          {/* one dashed ring, as a scale. Any more and it is a
              spider web competing with the shape. */}
          <motion.polygon
            points={parts
              .map((_, i) => {
                const p = point(i, MAX_R);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(" ")}
            fill="none"
            stroke="var(--border-soft)"
            strokeWidth={1}
            strokeDasharray="3 4"
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: 0.32, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            style={{ transformOrigin: `${MID}px ${MID}px` }}
          />

          <Outline arms={arms.slice(0, n)} point={point} visible={at >= 0} />

          {parts.map((e, i) => (
            <Dot
              key={`dot-${e.name}`}
              arm={arms[i]}
              point={point}
              index={i}
              hue={e.hue}
              shown={i <= at}
            />
          ))}
        </svg>

        {/* the labels, outside the shape, each on its own arm */}
        {parts.map((e, i) => {
          const p = point(i, MAX_R + 34);
          /* a label left of the middle reads right to left */
          const side = p.x < MID - 4 ? "end" : p.x > MID + 4 ? "start" : "center";
          return (
            <motion.div
              key={`label-${e.name}`}
              className="absolute w-[100px] text-[11.5px] leading-tight"
              style={{
                left: p.x,
                top: p.y,
                transform: `translate(${
                  side === "end" ? "-100%" : side === "start" ? "0" : "-50%"
                }, -50%)`,
                textAlign: side === "center" ? "center" : side,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: i <= at ? 1 : 0 }}
              transition={{ duration: 0.55, ease: EASE, delay: i <= at ? 0.4 : 0 }}
            >
              <div className="truncate text-muted-foreground">{e.name}</div>
              <div className="font-semibold tabular">
                {Math.round((flex * e.pct) / total)}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: at >= n - 1 ? 1 : 0 }}
        transition={{ duration: 0.7, delay: 0.7 }}
        className="mt-6 text-[14px] text-muted-foreground"
      >
        This is the shape of your month.
      </motion.p>
    </div>
  );
}

type Point = (i: number, r: number) => { x: number; y: number };

/** One spring per arm, so the outline can be read live. */
function useArms(targets: number[]) {
  const a = useSpring(0, SPRING);
  const b = useSpring(0, SPRING);
  const c = useSpring(0, SPRING);
  const d = useSpring(0, SPRING);
  const e = useSpring(0, SPRING);
  const f = useSpring(0, SPRING);
  const g = useSpring(0, SPRING);
  const h = useSpring(0, SPRING);

  const arms = useMemo(
    () => [a, b, c, d, e, f, g, h],
    [a, b, c, d, e, f, g, h],
  );

  useEffect(() => {
    arms.forEach((mv, i) => mv.set(targets[i] ?? 0));
  }, [arms, targets]);

  return arms;
}

/** Reads every arm on each frame and redraws the outline. */
function Outline({
  arms, point, visible,
}: {
  arms: MotionValue<number>[];
  point: Point;
  visible: boolean;
}) {
  const [points, setPoints] = useState("");

  useEffect(() => {
    const read = () =>
      setPoints(
        arms
          .map((mv, i) => {
            const p = point(i, mv.get());
            return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
          })
          .join(" "),
      );
    read();
    const stops = arms.map((mv) => mv.on("change", read));
    return () => stops.forEach((stop) => stop());
  }, [arms, point]);

  return (
    <motion.polygon
      points={points}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      fill="color-mix(in srgb, var(--primary) 11%, transparent)"
      stroke="var(--primary)"
      strokeWidth={1.75}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}

/** A corner, riding the same spring as its arm. */
function Dot({
  arm, point, index, hue, shown,
}: {
  arm: MotionValue<number>;
  point: Point;
  index: number;
  hue: string;
  shown: boolean;
}) {
  const [pos, setPos] = useState(() => point(index, 0));

  useEffect(() => {
    const read = () => setPos(point(index, arm.get()));
    read();
    return arm.on("change", read);
  }, [arm, point, index]);

  return (
    <motion.circle
      cx={pos.x}
      cy={pos.y}
      r={4}
      fill={`var(--hue-${hue})`}
      animate={{ opacity: shown ? 1 : 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    />
  );
}
