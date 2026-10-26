"use client";

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
 * The last thirty days as a row of blocks. The point is the
 * shape, whether spending comes in bursts or every day, so the
 * figures stay in the tooltip.
 */
export function DayStrip({ days, currency }: { days: StripDay[]; currency: string }) {
  const spentDays = days.filter((d) => d.spent > 0).length;
  const total = days.reduce((a, d) => a + d.spent, 0);

  return (
    <div>
      <div className="flex items-end gap-[3px]">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.label}: ${d.spent > 0 ? money(d.spent, currency) : "nothing"}`}
            className={cn(
              "h-9 flex-1 rounded-[3px] transition-colors",
              tone[d.level],
              d.today && "ring-2 ring-foreground/60 ring-offset-2 ring-offset-card",
            )}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-muted-foreground">
        <span>
          <b className="font-semibold text-foreground">{money(total, currency)}</b> over 30 days,
          across {spentDays} day{spentDays === 1 ? "" : "s"}
        </span>
        <span className="text-xs text-subtle-foreground">
          {days[0]?.label} to today
        </span>
      </div>
    </div>
  );
}
