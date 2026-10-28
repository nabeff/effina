"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { draftFlex, draftSplitTotal, type Draft } from "@/lib/budget";
import { money } from "@/lib/utils/money";

/**
 * The shape of a month.
 *
 * One axis per area, the way a player's attributes are drawn in
 * a football game. Every budget comes out as a different shape,
 * and the shape is the point: somebody who saves hard and eats
 * cheap looks nothing like somebody who does the reverse.
 *
 * Flat. No perspective, no glass, no depth. The whole thing is
 * two polygons and a few lines.
 */

const EASE = [0.32, 0.72, 0, 1] as const;

const SIZE = 380;
const MID = SIZE / 2;
/** how far the outermost ring sits from the middle */
const MAX_R = 132;
/** the floor, so a small share is still a visible arm */
const MIN_R = 34;
const RINGS = 1;

export function DividingRadar({
  draft, onDone,
}: {
  draft: Draft;
  onDone: () => void;
}) {
  const flex = draftFlex(draft);
  const unit = draft.currency || "DH";
  const total = draftSplitTotal(draft) || 100;

  /* the shape needs at least three arms to be a shape */
  const parts = useMemo(
    () =>
      draft.split
        .filter((e) => e.pct > 0)
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 8),
    [draft.split],
  );

  /* how many arms have been claimed so far */
  const [at_, setAt] = useState(-1);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    parts.forEach((_, i) => {
      timers.push(setTimeout(() => setAt(i), 650 + i * 420));
    });
    timers.push(setTimeout(onDone, 650 + parts.length * 420 + 1500));
    return () => timers.forEach(clearTimeout);
  }, [parts, onDone]);

  const n = parts.length;
  const biggest = Math.max(...parts.map((p) => p.pct), 1);

  /* straight up for the first arm, then evenly round */
  const angle = (i: number) => (i / n) * Math.PI * 2 - Math.PI / 2;
  const at = (i: number, r: number) => ({
    x: MID + Math.cos(angle(i)) * r,
    y: MID + Math.sin(angle(i)) * r,
  });

  const radius = (pct: number) => MIN_R + (pct / biggest) * (MAX_R - MIN_R);

  /* an arm that has not been claimed yet sits at the middle, so
     the shape grows outward one point at a time */
  const points = parts
    .map((e, i) => {
      const p = i <= at_ ? at(i, radius(e.pct)) : { x: MID, y: MID };
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="py-2 text-center select-none">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
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
          {/* the rings, faintest first, so the shape has a scale
              to be read against */}
          {Array.from({ length: RINGS }).map((_, r) => {
            const rr = MIN_R + ((r + 1) / RINGS) * (MAX_R - MIN_R);
            const pts = parts
              .map((_, i) => {
                const p = at(i, rr);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              })
              .join(" ");
            return (
              <motion.polygon
                key={`ring-${r}`}
                points={pts}
                fill="none"
                stroke="var(--border-soft)"
                strokeWidth={1}
                strokeDasharray="3 4"
                initial={{ opacity: 0, scale: 0.82 }}
                /* the rings fade as they go out, so the outer
                   one guides the eye instead of framing it */
                animate={{ opacity: 0.32, scale: 1 }}
                transition={{ duration: 0.5, ease: EASE, delay: r * 0.06 }}
                style={{ transformOrigin: `${MID}px ${MID}px` }}
              />
            );
          })}

          {/* the shape itself */}
          <motion.polygon
            animate={{ points, opacity: at_ >= 0 ? 1 : 0 }}
            transition={{ duration: 0.52, ease: EASE }}
            fill="color-mix(in srgb, var(--primary) 22%, transparent)"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* a dot at each corner, in the area's own colour, so
              the arms stay identifiable */}
          {parts.map((e, i) => {
            const p = at(i, radius(e.pct));
            return (
              <motion.circle
                key={`dot-${e.name}`}
                cx={p.x} cy={p.y} r={4.5}
                fill={`var(--hue-${e.hue})`}
                stroke="var(--background)"
                strokeWidth={1.5}
                initial={{ opacity: 0, scale: 0 }}
                animate={
                  i <= at_
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0 }
                }
                transition={{
                  type: "spring", stiffness: 420, damping: 24,
                  delay: i <= at_ ? 0.3 : 0,
                }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              />
            );
          })}
        </svg>

        {/* the labels, outside the shape, each on its own arm */}
        {parts.map((e, i) => {
          const p = at(i, MAX_R + 34);
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
              animate={{ opacity: i <= at_ ? 1 : 0 }}
              transition={{ duration: 0.4, delay: i <= at_ ? 0.34 : 0 }}
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
        animate={{ opacity: at_ >= n - 1 ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-6 text-[14px] text-muted-foreground"
      >
        This is the shape of your month.
      </motion.p>
    </div>
  );
}
