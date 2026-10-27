"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/utils/money";
import type { StripDay } from "@/lib/budget";

/* a quiet block at zero, the accent at its strongest on the busiest day */
const tone = [
  "bg-fill-2",
  "bg-primary/25",
  "bg-primary/45",
  "bg-primary/70",
  "bg-primary",
];

/**
 * The last thirty days as a row of blocks.
 *
 * The point is the shape, whether spending comes in bursts or
 * every day, so the figure for one day goes in a line underneath
 * rather than a tooltip that covers the next square. The blocks
 * do not move on hover for the same reason: the colour already
 * says which one you are on, and a lift pulls the eye to the
 * cursor instead of the month.
 */
export function DayStrip({ days, currency }: { days: StripDay[]; currency: string }) {
  const [at, setAt] = useState<string | null>(null);

  const spentDays = days.filter((d) => d.spent > 0).length;
  const total = days.reduce((a, d) => a + d.spent, 0);
  const shown = at ? days.find((d) => d.date === at) : days[days.length - 1];

  return (
    <div onMouseLeave={() => setAt(null)}>
      <div className="flex items-end gap-[3px]">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            onMouseEnter={() => setAt(d.date)}
            onFocus={() => setAt(d.date)}
            onClick={() => setAt(d.date)}
            aria-label={`${d.label}, ${d.spent > 0 ? money(d.spent, currency) : "nothing spent"}`}
            className={cn(
              "h-9 flex-1 rounded-[3px] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              tone[d.level],
              d.today && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-card",
              at === d.date && !d.today && "ring-2 ring-primary ring-offset-2 ring-offset-card",
            )}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-muted-foreground">
        <span>
          {shown ? (
            <>
              {shown.today ? "Today" : shown.label},{" "}
              <b className="font-semibold text-foreground">
                {money(shown.spent, currency)}
              </b>
            </>
          ) : null}
        </span>
        <span className="text-xs text-subtle-foreground">
          {money(total, currency)} over 30 days, across {spentDays} day
          {spentDays === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
