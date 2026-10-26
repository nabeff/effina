"use client";

import { Money } from "@/components/ui/money";
import { splitParts } from "@/lib/budget";
import type { MonthStats, SplitPart } from "@/types/budget";

const hueVar = (hue: SplitPart["hue"]) =>
  hue === "muted" ? "var(--subtle-foreground)" : `var(--hue-${hue})`;

/**
 * Every dirham that came in, shown as the parts it went to. The
 * segments are sized by amount and the labels sit under their own
 * colour, so the bar reads without a legend.
 */
export function SplitBar({ st, currency }: { st: MonthStats; currency: string }) {
  const parts = splitParts(st).filter((p) => p.amount > 0);
  const total = parts.reduce((a, p) => a + p.amount, 0) || 1;

  return (
    <div>
      <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full">
        {parts.map((p) => (
          <span
            key={p.key}
            className="block min-w-[4px] first:rounded-l-full last:rounded-r-full"
            style={{ flex: p.amount, background: hueVar(p.hue) }}
            title={`${p.name}: ${Math.round(p.amount).toLocaleString("en-US")} ${currency}`}
          />
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-x-2.5 gap-y-3 sm:grid-cols-3 lg:flex lg:gap-0.5">
        {parts.map((p) => (
          <div key={p.key} className="min-w-0 lg:pr-2.5" style={{ flex: p.amount }}>
            <span
              className="mb-1 block size-[9px] rounded-[3px]"
              style={{ background: hueVar(p.hue) }}
            />
            <div className="truncate text-xs text-muted-foreground">{p.name}</div>
            <div className="text-base font-bold tracking-[-0.024em]">
              <Money value={p.amount} currency="" unitClassName="hidden" />
            </div>
            <div className="text-[11.5px] font-semibold text-subtle-foreground tabular">
              {Math.round((p.amount / total) * 100)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
