"use client";

import { Check, SlidersHorizontal } from "lucide-react";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { ordinal } from "@/lib/utils/money";
import type { BillRow as Row, MonthStats } from "@/types/budget";

/**
 * One bill. The checkbox is the whole interaction, so it is the
 * only thing that glows. A paid bill keeps full contrast, only
 * the due line recedes, because dimming a row you just ticked
 * reads as the app losing it.
 */
export function BillRow({
  row, st, currency, onToggle, onEdit, busy,
}: {
  row: Row;
  st: MonthStats;
  currency: string;
  onToggle: (paid: boolean) => void;
  onEdit: () => void;
  busy?: boolean;
}) {
  const day = Math.min(row.dueDay, st.daysTotal);
  const overdue = !row.paid && !st.future && !st.closed && day < new Date().getDate();

  return (
    <div className="flex items-center gap-3.5 px-5 py-3.5">
      <button
        onClick={() => onToggle(!row.paid)}
        disabled={busy}
        role="checkbox"
        aria-checked={row.paid}
        aria-label={`${row.name}, ${row.paid ? "paid" : "not paid"}`}
        className={cn(
          "grid size-[19px] flex-none place-items-center rounded-full border-2 transition-all",
          row.paid
            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_7px_-1px_var(--primary)]"
            : "border-muted-foreground/60 bg-transparent hover:border-foreground",
          busy && "opacity-50",
        )}
      >
        {row.paid ? <Check className="size-3" strokeWidth={3.5} /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-medium">{row.name}</div>
        <div
          className={cn(
            "mt-px text-xs",
            row.paid
              ? "text-subtle-foreground"
              : overdue
                ? "font-medium text-warning"
                : "text-muted-foreground",
          )}
        >
          {row.paid ? "Paid" : `Due the ${ordinal(day)}`}
        </div>
      </div>

      <span
        className={cn(
          "flex-none text-[14.5px] font-semibold",
          row.paid && "text-muted-foreground",
        )}
      >
        <Money value={row.amount} currency={currency} animate={false} />
      </span>

      <button
        onClick={onEdit}
        aria-label={`Edit ${row.name}`}
        className="grid size-7 flex-none place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
      >
        <SlidersHorizontal className="size-4" />
      </button>
    </div>
  );
}
