"use client";

import { motion } from "framer-motion";
import { Money } from "@/components/ui/money";
import { monthName } from "@/lib/budget";
import type { MonthStats } from "@/types/budget";

function partOfDay(h: number): string {
  /* the small hours are still the night before to the person
     looking at the screen, not a new morning */
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The top of the page. The greeting dates the view, and the
 * balance is the one figure worth seeing before anything else.
 */
export function Greeting({
  st, currency, name,
}: {
  st: MonthStats;
  currency: string;
  name?: string;
}) {
  const now = new Date();
  const hello = partOfDay(now.getHours());

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.8, 0.3, 1] }}
      className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3"
    >
      <div className="min-w-0">
        <h1 className="text-[clamp(26px,4vw,34px)] leading-[1.05] font-bold tracking-[-0.034em]">
          {hello}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          {monthName(st.month, true)}
          {st.daysLeft > 0 && !st.future && !st.closed
            ? `, ${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"} left`
            : ""}
        </p>
      </div>

      <div className="text-right">
        <div className="text-xs font-semibold tracking-[0.01em] text-muted-foreground">
          Still available
        </div>
        <div className="mt-0.5 text-[clamp(24px,3.4vw,30px)] leading-none font-bold tracking-[-0.034em] text-primary">
          <Money value={st.leftToSpend} currency={currency} />
        </div>
      </div>
    </motion.div>
  );
}
