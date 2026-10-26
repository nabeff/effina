"use client";

import { Plus } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { money, money0 } from "@/lib/utils/money";
import type { EnvelopeRow as Row, MonthStats } from "@/types/budget";

const statusColor = {
  ok: "var(--primary)",
  close: "var(--warning)",
  over: "var(--destructive)",
} as const;

/**
 * Colour means status here and nothing else, so every icon stays
 * neutral. Green is fine, orange is nearly out, red is over.
 */
export function EnvelopeRow({
  row, st, currency, onAdd,
}: {
  row: Row;
  st: MonthStats;
  currency: string;
  onAdd: () => void;
}) {
  const through =
    st.daysTotal > 0 ? ((st.daysTotal - st.daysLeft + 1) / st.daysTotal) * 100 : 100;

  const daily =
    row.kind === "spend" && st.daysLeft > 0 && !st.future && !st.closed
      ? row.left < -0.5
        ? `Over by ${money(-row.left, currency)}`
        : `${money0(row.left / st.daysLeft)} ${currency} a day for ${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"}`
      : null;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-[15px] font-medium">{row.name}</span>
          <span className="flex-none text-[13px] font-medium text-muted-foreground tabular">
            {row.left < -0.5 ? (
              <span className="text-destructive">{money0(-row.left)} over</span>
            ) : (
              `${money0(row.left)} of ${money0(row.planned)} left`
            )}
          </span>
        </div>

        <ProgressBar
          value={Math.min(100, row.pctUsed)}
          marker={through}
          color={statusColor[row.status]}
          className="mt-2"
          height={6}
        />

        {daily ? (
          <div className={`mt-1.5 text-xs tabular ${row.left < -0.5 ? "text-destructive" : "text-subtle-foreground"}`}>
            {daily}
          </div>
        ) : null}
      </div>

      <button
        onClick={onAdd}
        aria-label={`Add to ${row.name}`}
        className="grid size-7 flex-none place-items-center rounded-full bg-fill-2 text-muted-foreground transition-colors hover:text-foreground active:scale-[0.92]"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
