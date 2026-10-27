"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { BillRow } from "@/components/features/bills/bill-row";
import { BillSheet } from "@/components/features/bills/bill-sheet";
import { tap } from "@/components/layout/native";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useBudgetMutation, useMonth } from "@/lib/hooks/use-budget";
import { setBillPaid } from "@/lib/supabase/mutations";
import { money } from "@/lib/utils/money";
import type { Bill } from "@/types/budget";

export default function BillsPage() {
  const mounted = useMounted();
  const { data, stats: st } = useMonth(mounted ? undefined : SKIP);

  const [sheet, setSheet] = useState<{ bill: Bill | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const toggle = useBudgetMutation(
    async (
      args: { bill: Bill; month: string; paid: boolean; date: string },
      { userId, supabase },
    ) => {
      await setBillPaid(supabase, userId, args.bill, args.month, args.paid, args.date);
    },
  );

  if (!mounted || !data || !st) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;
  const paid = st.billRows.filter((b) => b.paid);
  const left = st.billTotal - st.billsPaid;

  function onToggle(row: Bill, nowPaid: boolean) {
    if (!st) return;
    setBusy(row.id);

    /* a bill is logged on its own due day, not today, so a late
       tick still lands in the right place in the log */
    const day = Math.min(Math.max(1, row.dueDay), st.daysTotal);
    const date = `${st.month}-${String(day).padStart(2, "0")}`;

    toggle.mutate(
      { bill: row, month: st.month, paid: nowPaid, date },
      {
        onSuccess: () => {
          setBusy(null);
          if (nowPaid) void tap();
          toast.success(nowPaid ? `${row.name} paid` : `${row.name} unpaid`);
        },
        onError: (e) => {
          setBusy(null);
          toast.error(e instanceof Error ? e.message : "Could not change that");
        },
      },
    );
  }

  return (
    <>
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Bills this month" value={st.billTotal} currency={currency}
          delta={
            <span className="text-muted-foreground">
              across {st.billRows.length} bill{st.billRows.length === 1 ? "" : "s"}
            </span>
          }
        />
        <Stat
          label="Paid so far" value={st.billsPaid} currency={currency} tone="good"
          delta={
            <span className="text-muted-foreground">
              {paid.length} of {st.billRows.length} ticked
            </span>
          }
        />
        <Stat
          label="Still to pay" value={left} currency={currency}
          tone={left > 0 ? "warn" : "good"}
          delta={
            <span className="text-muted-foreground">
              {left > 0 ? "before the month ends" : "all settled"}
            </span>
          }
        />
      </section>

      <Section
        title="What leaves every month"
        sub="Tick one when it goes out. It is logged on its own due day."
        pad={st.billRows.length === 0}
        tools={
          <Button onClick={() => setSheet({ bill: null })}>
            <Plus className="size-4" />
            New bill
          </Button>
        }
      >
        {st.billRows.length ? (
          <div className="flex flex-col divide-y divide-border-soft">
            {st.billRows.map((row) => (
              <BillRow
                key={row.id}
                row={row}
                st={st}
                currency={currency}
                busy={busy === row.id}
                onToggle={(v) => onToggle(row, v)}
                onEdit={() => setSheet({ bill: row })}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
              <CheckCircle2 className="size-[22px]" />
            </span>
            <p className="text-[15px] font-semibold">No bills yet</p>
            <p className="mx-auto mt-1 max-w-[42ch] text-[13.5px] text-muted-foreground">
              Rent, loans, subscriptions. Whatever leaves every month before the rest is divided.
            </p>
            <Button className="mt-4" onClick={() => setSheet({ bill: null })}>
              <Plus className="size-4" />
              Add your first bill
            </Button>
          </div>
        )}
      </Section>

      {st.billRows.length ? (
        <p className="text-[13px] text-muted-foreground">
          Bills take <b className="font-semibold text-foreground">{money(st.billTotal, currency)}</b>{" "}
          of your {money(st.base, currency)}, which leaves{" "}
          <b className="font-semibold text-foreground">{money(st.flex, currency)}</b> to split
          between envelopes.
        </p>
      ) : null}

      <BillSheet
        bill={sheet?.bill ?? null}
        currency={currency}
        open={sheet !== null}
        onOpenChange={(v) => { if (!v) setSheet(null); }}
      />
    </>
  );
}
