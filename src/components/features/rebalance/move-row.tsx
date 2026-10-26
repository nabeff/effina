"use client";

import { ArrowRight, TriangleAlert } from "lucide-react";
import { money } from "@/lib/utils/money";
import type { Move } from "@/lib/budget/rebalance";

/**
 * One proposed move, written as a sentence rather than a form.
 * A move with no donor is the honest case: the money is simply
 * not there, and saying so beats showing a plan that cannot run.
 */
export function MoveRow({ move, currency }: { move: Move; currency: string }) {
  if (!move.from) {
    return (
      <div className="flex items-center gap-3 px-5 py-3.5">
        <span className="grid size-[30px] flex-none place-items-center rounded-full bg-[color-mix(in_srgb,var(--warning)_15%,transparent)] text-warning">
          <TriangleAlert className="size-4" />
        </span>
        <div className="min-w-0 flex-1 text-[14.5px]">
          <b className="font-semibold">{move.to.name}</b> is still short{" "}
          <b className="font-semibold text-warning">{money(move.amount, currency)}</b>
          <div className="mt-px text-xs text-subtle-foreground">
            Nothing left to move. This one needs more income or less spending.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <span
        className="size-[9px] flex-none rounded-[3px]"
        style={{ background: `var(--hue-${move.from.hue})` }}
      />
      <span className="min-w-0 truncate text-[14.5px] font-medium">{move.from.name}</span>
      <ArrowRight className="size-3.5 flex-none text-subtle-foreground" />
      <span
        className="size-[9px] flex-none rounded-[3px]"
        style={{ background: `var(--hue-${move.to.hue})` }}
      />
      <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{move.to.name}</span>
      <span className="flex-none text-[14.5px] font-semibold tabular">
        {money(move.amount, currency)}
      </span>
    </div>
  );
}
