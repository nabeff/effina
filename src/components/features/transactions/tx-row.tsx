"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";
import { monthName } from "@/lib/budget";
import type { BudgetData, Transaction } from "@/types/budget";

export function TxRow({
  tx, data, onEdit, onDelete,
}: {
  tx: Transaction;
  data: BudgetData;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const envelope = data.envelopes.find((e) => e.id === tx.envelopeId);
  const bill = data.bills.find((b) => b.id === tx.billId);
  const isIn = tx.direction === "in";

  const label = isIn ? "Income" : envelope?.name ?? bill?.name ?? "Unsorted";
  const hue = isIn
    ? "var(--primary)"
    : `var(--hue-${envelope?.hue ?? bill?.hue ?? "teal"})`;

  return (
    <div className="relative flex min-h-12 items-center gap-3 px-5 py-3">
      <span className="size-[9px] flex-none rounded-full" style={{ background: hue }} />

      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium tracking-[-0.012em]">
          {tx.note || "(no note)"}
        </div>
        <div className="mt-px text-[13px] text-muted-foreground">
          {label} &middot; {tx.date.slice(8)} {monthName(tx.date.slice(0, 7))}
          {tx.isSample ? " · example" : ""}
        </div>
      </div>

      <div className={cn(
        "flex-none text-[15px] font-semibold tracking-[-0.016em]",
        isIn && "text-primary",
      )}>
        {isIn ? "+" : ""}
        <Money value={tx.amount} currency={data.settings.currency} animate={false} />
      </div>

      <button
        onClick={onEdit}
        aria-label={`Edit ${tx.note || "line"}`}
        className="grid size-7 flex-none place-items-center rounded-full text-muted-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
      >
        <Pencil className="size-4" />
      </button>
      <button
        onClick={onDelete}
        aria-label={`Delete ${tx.note || "line"}`}
        className="grid size-7 flex-none place-items-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
