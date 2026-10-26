"use client";

import { RotateCcw } from "lucide-react";
import { Money } from "@/components/ui/money";
import type { BudgetData, Transaction } from "@/types/budget";

/**
 * The last few things logged, each with a one tap repeat. Most
 * spending is the same few things over and over, so logging the
 * coffee again should not mean filling a form again.
 */
export function RecentSpends({
  rows, data, onAgain,
}: {
  rows: Transaction[];
  data: BudgetData;
  onAgain: (tx: Transaction) => void;
}) {
  if (!rows.length) {
    return (
      <p className="py-6 text-center text-[13.5px] text-muted-foreground">
        Nothing logged yet. What you add shows up here, ready to repeat.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border-soft">
      {rows.map((t) => {
        const env = data.envelopes.find((e) => e.id === t.envelopeId);
        return (
          <div key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className="size-[9px] flex-none rounded-[3px]"
              style={{ background: `var(--hue-${env?.hue ?? "green"})` }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-medium">
                {t.note || env?.name || "Spending"}
              </div>
              <div className="mt-px truncate text-xs text-subtle-foreground">
                {env?.name ?? "No envelope"}
              </div>
            </div>
            <span className="flex-none text-[14.5px] font-semibold">
              <Money value={t.amount} currency={data.settings.currency} animate={false} />
            </span>
            <button
              onClick={() => onAgain(t)}
              aria-label={`Log ${t.note || env?.name || "this"} again`}
              className="flex flex-none items-center gap-1.5 rounded-full bg-fill-2 px-3 py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <RotateCcw className="size-3.5" />
              Again
            </button>
          </div>
        );
      })}
    </div>
  );
}
