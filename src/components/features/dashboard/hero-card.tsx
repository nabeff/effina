"use client";

import { useState } from "react";
import { Money } from "@/components/ui/money";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Ring } from "@/components/ui/ring";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { money } from "@/lib/utils/money";
import { affordState, paceState, todayState, todayISO } from "@/lib/budget";
import type { BudgetData, MonthStats } from "@/types/budget";

const toneColor = {
  good: "var(--primary)",
  warn: "var(--warning)",
  bad: "var(--destructive)",
  neutral: "var(--foreground)",
} as const;

/**
 * The one answer. Everything else on the page explains this
 * number or shows what happens if it changes.
 */
export function HeroCard({ data, st }: { data: BudgetData; st: MonthStats }) {
  const [afford, setAfford] = useState("");
  const currency = data.settings.currency;
  const pace = paceState(st);
  const today = todayState(data, st, todayISO());
  const check = affordState(st, Number(afford) || 0);

  return (
    <div className="glass mb-8 rounded-[var(--radius)]">
      <div className="grid gap-6 px-6 py-[22px] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div>
          <div className="text-xs font-semibold tracking-[0.01em] text-muted-foreground">
            {st.future ? "Planned to spend" : "Free to spend"}
          </div>

          <div className="text-[clamp(34px,8.5vw,58px)] leading-[1.05] font-bold tracking-[-0.045em]">
            <Money value={st.leftToSpend} currency={currency} unitClassName="text-[0.5em]" />
          </div>

          <div className="text-[15px] text-muted-foreground">
            {st.daysLeft > 0
              ? `${money(st.perDay, currency)} a day for the next ${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"}`
              : "This month is finished"}
          </div>

          {st.daysLeft > 0 && !st.closed && !st.future ? (
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <span className="text-[13.5px] text-muted-foreground">Can I afford</span>
              <div className="relative w-[108px] flex-none">
                <Input
                  type="number" min={0} inputMode="decimal" placeholder="0"
                  aria-label="Amount to check"
                  value={afford} onChange={(e) => setAfford(e.target.value)}
                  className="h-[34px] rounded-[9px] pr-9 text-[14.5px]"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-semibold text-subtle-foreground">
                  {currency}
                </span>
              </div>
              {check.amount > 0 ? (
                <span className={cn(
                  "text-[13.5px] font-semibold",
                  check.tight ? "text-destructive" : "text-primary",
                )}>
                  {check.tight
                    ? `After ${money(check.amount, currency)}: ${money(-check.left, currency)} short`
                    : `After ${money(check.amount, currency)}: ${money(check.perDay, currency)} a day for ${check.days} day${check.days === 1 ? "" : "s"}`}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {!st.future ? (
          <div>
            {st.daysLeft > 0 ? (
              <div className="mb-4 flex items-center gap-3.5">
                <Ring
                  value={today.pct} size={54} stroke={7}
                  color={today.over ? "var(--destructive)" : "var(--primary)"}
                />
                <div>
                  <div className="text-xs font-semibold text-muted-foreground">Today</div>
                  <div className="mt-px text-[19px] font-bold tracking-[-0.025em]">
                    <Money value={today.spent} currency="" unitClassName="hidden" />
                    <span className="ml-1 text-[13px] font-normal text-muted-foreground">
                      of {money(today.allowance, currency)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">Days passed</span>
              <span className="font-semibold">{Math.round(pace.through)}%</span>
            </div>
            <ProgressBar value={pace.through} color="var(--muted-foreground)" className="mb-3" />

            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="text-muted-foreground">Money spent</span>
              <span className="font-semibold" style={{ color: toneColor[pace.tone] }}>
                {pace.used}%
              </span>
            </div>
            <ProgressBar value={pace.used} marker={pace.through} color={toneColor[pace.tone]} />

            <div className="mt-3">
              <span
                className="rounded-[9px] px-2.5 py-1 text-xs font-semibold"
                style={{
                  color: toneColor[pace.tone],
                  background: `color-mix(in srgb, ${toneColor[pace.tone]} 16%, transparent)`,
                }}
              >
                {pace.label}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
