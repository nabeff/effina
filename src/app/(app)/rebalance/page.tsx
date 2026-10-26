"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { CheckCircle2, Scale, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { MoveRow } from "@/components/features/rebalance/move-row";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useBudgetMutation, useMonth } from "@/lib/hooks/use-budget";
import { applyTransfers, undoTransfer } from "@/lib/supabase/mutations";
import { donorRank, isoDate, planMoves } from "@/lib/budget";
import { money } from "@/lib/utils/money";

export default function RebalancePage() {
  const mounted = useMounted();

  const { data, stats } = useMonth(mounted ? undefined : SKIP);

  const apply = useBudgetMutation(
    async (
      args: { month: string; moves: { from: string; to: string; amount: number }[] },
      { userId, supabase },
    ) => {
      await applyTransfers(supabase, userId, args.month, isoDate(new Date()), args.moves);
    },
  );

  const undo = useBudgetMutation(async (id: string, { supabase }) => {
    await undoTransfer(supabase, id);
  });

  const plan = useMemo(() => (stats ? planMoves(stats) : null), [stats]);

  if (!mounted || !data || !stats || !plan) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;
  const thisMonthTransfers = data.transfers.filter((t) => t.month === stats.month);
  const movable = plan.moves.filter((m) => m.from);
  const shortfall = plan.moves.filter((m) => !m.from).reduce((a, m) => a + m.amount, 0);
  const total = movable.reduce((a, m) => a + m.amount, 0);

  const donors = stats.envRows
    .filter((r) => donorRank(r) < 9 && r.left > 0.5)
    .sort((a, b) => donorRank(a) - donorRank(b));

  const nameOf = (id: string | null) =>
    id ? (data.envelopes.find((e) => e.id === id)?.name ?? "Gone") : "Nowhere";

  function run() {
    if (!plan || !stats) return;
    apply.mutate(
      {
        month: stats.month,
        moves: movable.map((m) => ({ from: m.from!.id, to: m.to.id, amount: m.amount })),
      },
      {
        onSuccess: () =>
          toast.success(
            `Moved ${money(total, currency)} across ${movable.length} transfer${movable.length === 1 ? "" : "s"}`,
          ),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Could not move the money"),
      },
    );
  }

  return (
    <>
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Envelopes over" value={plan.over.length} currency=""
          tone={plan.over.length ? "bad" : "good"}
          delta={
            <span className="text-muted-foreground">
              {plan.over.length ? "need covering" : "nothing to fix"}
            </span>
          }
        />
        <Stat
          label="Spare to move" value={plan.pool} currency={currency}
          tone={plan.pool > 0 ? "good" : "neutral"}
          delta={
            <span className="text-muted-foreground">
              across {donors.length} envelope{donors.length === 1 ? "" : "s"}
            </span>
          }
        />
        <Stat
          label="Still short" value={shortfall} currency={currency}
          tone={shortfall > 0 ? "warn" : "good"}
          delta={
            <span className="text-muted-foreground">
              {shortfall > 0 ? "more than you have" : "fully covered"}
            </span>
          }
        />
      </section>

      <Section
        data-tour="rebalance"
        title="The plan"
        sub="Fun money goes first, then girlfriend, then everyday spending, then emergency, then savings. Tax and debt are never touched, because that money is owed."
        pad={plan.moves.length === 0}
        tools={
          movable.length ? (
            <Button onClick={run} disabled={apply.isPending}>
              <Scale className="size-4" />
              {apply.isPending ? "Moving" : `Move ${money(total, currency)}`}
            </Button>
          ) : null
        }
      >
        {plan.moves.length ? (
          <div className="flex flex-col divide-y divide-border-soft">
            {plan.moves.map((m, i) => (
              <MoveRow key={`${m.to.id}-${i}`} move={m} currency={currency} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
              <CheckCircle2 className="size-[22px]" />
            </span>
            <p className="text-[15px] font-semibold">Nothing is over</p>
            <p className="mx-auto mt-1 max-w-[42ch] text-[13.5px] text-muted-foreground">
              Every envelope is inside its budget this month, so there is nothing to move.
            </p>
          </div>
        )}
      </Section>

      {donors.length ? (
        <Section
          title="Who can give"
          sub="In the order they would be asked."
          pad={false}
        >
          <div className="flex flex-col divide-y divide-border-soft">
            {donors.map((d, i) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-[22px] flex-none place-items-center rounded-full bg-fill-2 text-[11.5px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className="size-[9px] flex-none rounded-[3px]"
                  style={{ background: `var(--hue-${d.hue})` }}
                />
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium">{d.name}</span>
                <span className="flex-none text-[14.5px] font-semibold text-primary tabular">
                  {money(d.left, currency)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {thisMonthTransfers.length ? (
        <Section
          title="Already moved this month"
          sub="Undo puts the money straight back."
          pad={false}
        >
          <div className="flex flex-col divide-y divide-border-soft">
            {thisMonthTransfers.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="min-w-0 flex-1 truncate text-[14.5px]">
                  {nameOf(t.fromEnvelope)}
                  <span className="mx-1.5 text-subtle-foreground">to</span>
                  {nameOf(t.toEnvelope)}
                </span>
                <span className="flex-none text-[14.5px] font-semibold tabular">
                  {money(t.amount, currency)}
                </span>
                <button
                  onClick={() =>
                    undo.mutate(t.id, {
                      onSuccess: () => toast.success("Put back"),
                    })
                  }
                  aria-label="Undo this move"
                  className="grid size-7 flex-none place-items-center rounded-full text-subtle-foreground transition-colors hover:bg-fill-2 hover:text-foreground"
                >
                  <Undo2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
