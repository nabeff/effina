"use client";

import { Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Money } from "@/components/ui/money";
import { ProgressBar } from "@/components/ui/progress-bar";
import { money, money0 } from "@/lib/utils/money";
import type { Goal } from "@/types/budget";
import type { GoalState } from "@/lib/budget/goals";

/**
 * Leads with what is left and the monthly rate, because a ring at
 * zero percent says nothing on a goal you just added.
 */
export function GoalCard({
  goal, state, when, share, currency, onShareChange, onAddMoney, onEdit,
}: {
  goal: Goal;
  state: GoalState;
  when: string | null;
  share: { amount: number; pct: number } | undefined;
  currency: string;
  onShareChange: (v: number) => void;
  onAddMoney: () => void;
  onEdit: () => void;
}) {
  const hue = `var(--hue-${goal.hue})`;
  const pct = Math.max(0, Math.min(100, state.pct));

  return (
    <div
      className="flex flex-col rounded-[var(--radius)] bg-card px-[17px] pt-4 pb-[15px]"
      style={{ ["--gc" as string]: hue }}
    >
      <div className="mb-3.5 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold tracking-[-0.014em]">
            {goal.name}
          </div>
          <div className="mt-0.5 text-xs text-subtle-foreground">
            {state.done ? "Fully saved" : when ?? "No date yet"}
          </div>
        </div>
        <button
          onClick={onEdit}
          aria-label={`Edit ${goal.name}`}
          className="grid size-7 flex-none place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
        >
          <SlidersHorizontal className="size-4" />
        </button>
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[26px] font-bold tracking-[-0.034em]" style={{ color: hue }}>
          <Money value={state.done ? state.price : state.left} currency={currency} />
        </span>
        <span className="text-[13px] text-muted-foreground">
          {state.done ? "paid for" : "to go"}
        </span>
      </div>

      <ProgressBar value={pct} color={hue} height={6} />

      <div className="mt-2 flex items-baseline justify-between text-xs text-subtle-foreground">
        <span>{money0(state.saved)} of {money0(state.price)} {currency}</span>
        <span className="font-semibold text-muted-foreground tabular">{Math.round(pct)}%</span>
      </div>

      {!state.done ? (
        <>
          <div className="mt-3.5 border-t border-border-soft pt-3 text-xs leading-relaxed text-muted-foreground">
            {share && share.amount > 0 ? (
              <>
                <b className="font-semibold text-foreground">{money(share.amount, currency)}</b>{" "}
                a month, {Math.round(share.pct)}% of your saving
              </>
            ) : (
              <>
                <b className="font-semibold text-foreground">No share yet</b>, so this one has no date
              </>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <Slider
              value={[goal.share]}
              min={0} max={100} step={5}
              onValueChange={(v) => onShareChange(Array.isArray(v) ? v[0] : v)}
              aria-label={`Share of savings for ${goal.name}`}
              className="flex-1 [&_[data-slot=slider-range]]:bg-(--gc) [&_[data-slot=slider-thumb]]:size-[15px] [&_[data-slot=slider-thumb]]:border-(--gc) [&_[data-slot=slider-track]]:h-1.5 [&_[data-slot=slider-track]]:bg-fill-2"
            />
            <span className="w-9 flex-none text-right text-xs font-semibold text-muted-foreground tabular">
              {goal.share}%
            </span>
          </div>
        </>
      ) : null}

      <Button
        onClick={onAddMoney}
        variant="ghost"
        className="mt-3.5 h-[38px] w-full"
        style={{
          background: `color-mix(in srgb, ${hue} 15%, transparent)`,
          color: hue,
        }}
      >
        <Plus className="size-4" />
        {state.done ? "Add more" : "Add money"}
      </Button>
    </div>
  );
}
