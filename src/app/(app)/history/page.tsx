"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryChart, type HistoryPoint } from "@/components/features/charts/history-chart";
import { SKIP, useBudgetMutation, useMonth } from "@/lib/hooks/use-budget";
import { closeMonth, reopenMonth } from "@/lib/supabase/mutations";
import { stats } from "@/lib/budget";
import { money } from "@/lib/utils/money";

function label(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data, stats: st } = useMonth(mounted ? undefined : SKIP);

  const close = useBudgetMutation(async (month: string, { userId, supabase }) => {
    if (!data) return;
    const s = stats(data, month);
    await closeMonth(
      supabase, userId, month,
      {
        income: s.income, spent: s.spent, saved: s.saved,
        billTotal: s.billsPaid, debtPaid: s.envRows.find((r) => r.kind === "debt")?.spent ?? 0,
        rolled: s.leftToSpend,
      },
      s.envRows.map((r) => ({ envelopeId: r.id, name: r.name, amount: r.spent })),
    );
  });

  const reopen = useBudgetMutation(async (month: string, { userId, supabase }) => {
    await reopenMonth(supabase, userId, month);
  });

  const closed = useMemo(
    () => (data ? [...data.closedMonths].sort((a, b) => b.month.localeCompare(a.month)) : []),
    [data],
  );

  const points: HistoryPoint[] = useMemo(
    () =>
      [...closed]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((c) => ({
          month: c.month,
          label: label(c.month),
          income: c.income,
          bills: c.billTotal,
          /* spent is the whole month, bills and saving included, so
             the spending band is what is left once both come out */
          spent: Math.max(0, c.spent - c.billTotal - c.saved),
          saved: c.saved,
          left: Math.max(0, c.income - c.spent),
        })),
    [closed],
  );

  if (!mounted || !data || !st) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;
  const months = closed.length;
  const avgIncome = months ? closed.reduce((a, c) => a + c.income, 0) / months : 0;
  const avgSaved = months ? closed.reduce((a, c) => a + c.saved, 0) / months : 0;
  const bestMonth = closed.reduce<typeof closed[number] | null>(
    (best, c) => (!best || c.saved > best.saved ? c : best),
    null,
  );

  const alreadyClosed = closed.some((c) => c.month === st.month);

  return (
    <>
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Months closed" value={months} currency=""
          delta={<span className="text-muted-foreground">in the record</span>}
        />
        <Stat
          label="Earned a month" value={avgIncome} currency={currency}
          delta={<span className="text-muted-foreground">on average</span>}
        />
        <Stat
          label="Saved a month" value={avgSaved} currency={currency} tone="good"
          delta={
            <span className="text-muted-foreground">
              {bestMonth ? `best was ${label(bestMonth.month)}` : "no months yet"}
            </span>
          }
        />
      </section>

      {!alreadyClosed && !st.future ? (
        <Section
          title="Close this month"
          sub={`Saves ${label(st.month)} into the record. You can reopen it afterwards.`}
          tools={
            <Button
              onClick={() =>
                close.mutate(st.month, {
                  onSuccess: () => toast.success(`${label(st.month)} saved into history`),
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : "Could not close the month"),
                })
              }
              disabled={close.isPending}
            >
              <Archive className="size-4" />
              {close.isPending ? "Closing" : "Close the month"}
            </Button>
          }
        >
          <div className="grid gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Earned</span>
              <span className="font-semibold tabular">{money(st.income, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bills paid</span>
              <span className="font-semibold tabular">{money(st.billsPaid, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spent</span>
              <span className="font-semibold tabular">{money(st.spent, currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saved</span>
              <span className="font-semibold text-primary tabular">
                {money(st.saved, currency)}
              </span>
            </div>
          </div>
        </Section>
      ) : null}

      {points.length ? (
        <Section
          title="Where the money went"
          sub="Each bar is one month of income, divided into what it went on."
        >
          <HistoryChart points={points} currency={currency} />
        </Section>
      ) : null}

      <Section
        title="Closed months"
        sub={months ? `${months} in the record` : undefined}
        pad={months === 0}
      >
        {months ? (
          <div className="flex flex-col divide-y divide-border-soft">
            {closed.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5">
                <span className="min-w-[96px] flex-none text-[14.5px] font-semibold">
                  {label(c.month)}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  earned{" "}
                  <b className="font-semibold text-foreground tabular">
                    {money(c.income, currency)}
                  </b>
                </span>
                <span className="text-[13px] text-muted-foreground">
                  spent{" "}
                  <b className="font-semibold text-foreground tabular">
                    {money(c.spent, currency)}
                  </b>
                </span>
                <span className="ml-auto text-[13px] text-muted-foreground">
                  saved{" "}
                  <b className="font-semibold text-primary tabular">
                    {money(c.saved, currency)}
                  </b>
                </span>
                <button
                  onClick={() =>
                    reopen.mutate(c.month, {
                      onSuccess: () => toast.success(`${label(c.month)} reopened`),
                    })
                  }
                  aria-label={`Reopen ${label(c.month)}`}
                  className="grid size-7 flex-none place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
                >
                  <RotateCcw className="size-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-[15px] font-semibold">No closed months yet</p>
            <p className="mx-auto mt-1 max-w-[42ch] text-[13.5px] text-muted-foreground">
              Closing a month files its totals here, so you can see how one month compares to the next.
            </p>
          </div>
        )}
      </Section>
    </>
  );
}
