"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { money } from "@/lib/utils/money";
import type { MonthStats } from "@/types/budget";

const SIZE = 260;
const STROKE = 26;
const GAP = 1.4;          // degrees of card between segments
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/**
 * Every envelope as one ring.
 *
 * Drawn as an SVG rather than a chart library so the stroke, the
 * gaps and the draw-in are exactly as intended, and so hovering a
 * segment can change the middle rather than float a tooltip over
 * the thing you are reading.
 */
export function BudgetRing({
  st, currency,
}: {
  st: MonthStats;
  currency: string;
}) {
  const [at, setAt] = useState<string | null>(null);

  const rows = st.envRows.filter((r) => r.planned > 0);
  const total = rows.reduce((a, r) => a + r.planned, 0);
  if (!rows.length || total <= 0) return null;

  /* each segment starts where every earlier one ended, summed up
     front rather than accumulated into a variable during render */
  const arcs = rows.map((r, i) => {
    const share = r.planned / total;
    const before = rows
      .slice(0, i)
      .reduce((a, x) => a + (x.planned / total) * 360, 0);

    return {
      id: r.id,
      name: r.name,
      hue: r.hue,
      planned: r.planned,
      spent: r.spent,
      left: r.left,
      /* the gap is taken out of the segment, so the ring still
         closes exactly rather than drifting open */
      length: Math.max(0, share * C - (GAP / 360) * C),
      offset: before,
      pct: share * 100,
    };
  });

  const active = at ? arcs.find((a) => a.id === at) : null;
  const spentAll = rows.reduce((a, r) => a + r.spent, 0);

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-8">
      <div
        className="relative flex-none"
        style={{ width: SIZE, height: SIZE }}
        onMouseLeave={() => setAt(null)}
      >
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={`Your ${money(total, currency)} divided across ${rows.length} envelopes`}
        >
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" stroke="var(--fill-2)" strokeWidth={STROKE}
          />

          {arcs.map((a, i) => (
            <motion.circle
              key={a.id}
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke={`var(--hue-${a.hue})`}
              strokeWidth={at === a.id ? STROKE + 6 : STROKE}
              strokeLinecap="butt"
              strokeDasharray={`${a.length} ${C - a.length}`}
              initial={{ strokeDashoffset: -((a.offset / 360) * C) + C }}
              animate={{ strokeDashoffset: -((a.offset / 360) * C) }}
              transition={{
                duration: 0.9,
                delay: 0.1 + i * 0.055,
                ease: [0.32, 0.72, 0, 1],
              }}
              onMouseEnter={() => setAt(a.id)}
              style={{ cursor: "pointer", transition: "stroke-width .18s var(--ease)" }}
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <motion.div
            key={active?.id ?? "all"}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.25, 0.8, 0.3, 1] }}
            className="px-8 text-center"
          >
            {active ? (
              <>
                <div className="truncate text-[12.5px] font-semibold text-muted-foreground">
                  {active.name}
                </div>
                <div
                  className="mt-0.5 text-[26px] leading-none font-bold tracking-[-0.034em] tabular"
                  style={{ color: `var(--hue-${active.hue})` }}
                >
                  {money(active.planned, currency)}
                </div>
                <div className="mt-1.5 text-[12px] text-subtle-foreground">
                  {active.left < -0.5
                    ? `${money(-active.left, currency)} over`
                    : `${money(active.left, currency)} left`}
                </div>
              </>
            ) : (
              <>
                <div className="text-[12.5px] font-semibold text-muted-foreground">
                  To divide
                </div>
                <div className="mt-0.5 text-[30px] leading-none font-bold tracking-[-0.036em]">
                  <Money value={total} currency={currency} />
                </div>
                <div className="mt-1.5 text-[12px] text-subtle-foreground">
                  {money(spentAll, currency)} spent so far
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>

      <div className="grid w-full min-w-0 flex-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {arcs.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.04, duration: 0.3 }}
            onMouseEnter={() => setAt(a.id)}
            onMouseLeave={() => setAt(null)}
            className={cn(
              "flex items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left transition-colors",
              at === a.id ? "bg-fill-2" : "hover:bg-fill-2",
            )}
          >
            <span
              className="size-[10px] flex-none rounded-[3px] transition-transform"
              style={{
                background: `var(--hue-${a.hue})`,
                transform: at === a.id ? "scale(1.25)" : undefined,
              }}
            />
            <span className="min-w-0 flex-1 truncate text-[13.5px]">{a.name}</span>
            <span className="flex-none text-[13.5px] font-semibold tabular">
              {money(a.planned, currency)}
            </span>
            <span className="w-9 flex-none text-right text-[11.5px] text-subtle-foreground tabular">
              {Math.round(a.pct)}%
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
