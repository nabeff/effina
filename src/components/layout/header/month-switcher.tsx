"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useShell } from "@/lib/hooks/use-shell";
import { shiftMonth } from "@/lib/budget";
import { cn } from "@/lib/utils";

/**
 * Which month you are looking at.
 *
 * Two arrows for the common move, one step at a time, and the
 * name itself opens a picker for the rarer jump to a month
 * further back. A future month is allowed, because planning one
 * is a reasonable thing to want.
 */

function label(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function short(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export function MonthSwitcher() {
  const { month, today, setMonth, stepMonth, atToday } = useShell();

  /* a year and a half back, three months forward. Enough to
     check last year without a scrolling list. */
  const months = useMemo(
    () =>
      today
        ? Array.from({ length: 21 }, (_, i) => shiftMonth(today, 3 - i))
        : [],
    [today],
  );

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-hairline bg-card/60 p-0.5">
      <Step label="Previous month" onClick={() => stepMonth(-1)}>
        <ChevronLeft className="size-[15px]" />
      </Step>

      <Popover>
        <PopoverTrigger
          render={
            <button className="rounded-full px-2 py-1 text-[12.5px] font-medium whitespace-nowrap transition-colors hover:bg-fill-2">
              <span className="hidden sm:inline">{label(month)}</span>
              <span className="sm:hidden">{short(month)}</span>
            </button>
          }
        />
        <PopoverContent align="center" className="w-[260px] p-2">
          <div className="grid grid-cols-3 gap-1">
            {months.map((m) => {
              const on = m === month;
              const now = m === today;
              return (
                <button
                  key={m}
                  onClick={() => setMonth(m)}
                  className={cn(
                    "rounded-[var(--radius-control)] px-2 py-2 text-[12px] transition-colors",
                    on
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:bg-fill-2 hover:text-foreground",
                  )}
                >
                  {short(m)}
                  {now && !on ? (
                    <span className="mt-0.5 block text-[10px] text-primary">now</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Step label="Next month" onClick={() => stepMonth(1)}>
        <ChevronRight className="size-[15px]" />
      </Step>

      {/* the way back, only when you have wandered off */}
      {!atToday ? (
        <motion.button
          initial={{ opacity: 0, width: 0 }}
          animate={{ opacity: 1, width: "auto" }}
          onClick={() => setMonth(today)}
          className="overflow-hidden rounded-full px-2 py-1 text-[11.5px] whitespace-nowrap text-primary"
        >
          Today
        </motion.button>
      ) : null}
    </div>
  );
}

function Step({
  label, children, onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      aria-label={label}
      onClick={onClick}
      className="grid size-6 flex-none place-items-center rounded-full text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
    >
      {children}
    </motion.button>
  );
}
