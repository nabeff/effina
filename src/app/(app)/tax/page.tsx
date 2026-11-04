"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useBudgetMutation, useMonth } from "@/lib/hooks/use-budget";
import { useShell } from "@/lib/hooks/use-shell";
import { updateSettings } from "@/lib/supabase/mutations";
import { debtState, taxState, taxYear } from "@/lib/budget";
import { money } from "@/lib/utils/money";

export default function TaxPage() {
  const mounted = useMounted();

  /* the header owns which month is on screen */
  const { month } = useShell();
  const { data, stats } = useMonth(mounted ? month : SKIP);
  const [paidDraft, setPaidDraft] = useState("");

  const save = useBudgetMutation(
    async (args: { year: string; amount: number }, { userId, supabase }) => {
      if (!data) return;
      await updateSettings(supabase, userId, {
        taxPaid: { ...data.settings.taxPaid, [args.year]: args.amount },
      });
    },
  );

  const tax = useMemo(
    () => (data && stats ? taxState(data, stats.month) : null),
    [data, stats],
  );
  const debt = useMemo(
    () => (data && stats ? debtState(data, stats.month) : null),
    [data, stats],
  );

  if (!mounted || !data || !stats || !tax || !debt) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;
  const year = taxYear(stats.month);

  return (
    <>
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label={`Earned in ${year}`} value={tax.income} currency={currency}
          delta={<span className="text-muted-foreground">at {tax.rate}% tax</span>}
        />
        <Stat
          label="Tax you owe" value={tax.left} currency={currency}
          tone={tax.left > 0 ? "warn" : "good"}
          delta={
            <span className="text-muted-foreground">
              {tax.paid > 0 ? `${money(tax.paid, currency)} already paid` : "nothing paid yet"}
            </span>
          }
        />
        <Stat
          label="Put aside" value={tax.aside} currency={currency}
          tone={tax.ok ? "good" : "bad"}
          delta={
            <span className="text-muted-foreground">
              {tax.ok
                ? `${money(Math.max(0, tax.gap), currency)} more than needed`
                : `${money(tax.short, currency)} short`}
            </span>
          }
        />
      </section>

      <Section title={`Tax for ${year}`}>
        <div className="flex items-start gap-3.5">
          <span
            className="grid size-[34px] flex-none place-items-center rounded-full"
            style={{
              background: tax.ok
                ? "color-mix(in srgb, var(--primary) 15%, transparent)"
                : "color-mix(in srgb, var(--destructive) 15%, transparent)",
              color: tax.ok ? "var(--primary)" : "var(--destructive)",
            }}
          >
            {tax.ok ? <CheckCircle2 className="size-[18px]" /> : <TriangleAlert className="size-[18px]" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15.5px] leading-snug font-semibold tracking-[-0.015em]">
              {tax.left <= 0
                ? "Tax for this year is settled."
                : tax.ok
                  ? `Covered. The reserve holds ${money(tax.aside, currency)} against ${money(tax.left, currency)} owed.`
                  : `Short by ${money(tax.short, currency)}. The reserve will not cover the bill as things stand.`}
            </div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              {tax.rate}% of {money(tax.income, currency)} earned so far this year.
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar
            value={tax.covered}
            color={tax.ok ? "var(--primary)" : "var(--destructive)"}
            height={8}
          />
          <div className="mt-2 flex items-baseline justify-between text-xs text-subtle-foreground">
            <span>{money(tax.aside, currency)} set aside</span>
            <span>{money(tax.left, currency)} to cover</span>
          </div>
        </div>
      </Section>

      <Section
        title="Record a payment"
        sub="What you have actually handed over to the tax office this year."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Label htmlFor="taxPaid">Paid so far in {year}</Label>
            <Input
              id="taxPaid"
              inputMode="decimal"
              className="mt-1.5"
              placeholder={String(tax.paid)}
              value={paidDraft}
              onChange={(e) => setPaidDraft(e.target.value)}
            />
          </div>
          <Button
            disabled={save.isPending || paidDraft.trim() === ""}
            onClick={() => {
              const amount = Number(paidDraft.replace(/[^\d.-]/g, ""));
              if (!Number.isFinite(amount) || amount < 0) {
                toast.error("That is not an amount");
                return;
              }
              save.mutate(
                { year, amount },
                {
                  onSuccess: () => {
                    setPaidDraft("");
                    toast.success(`Recorded ${money(amount, currency)} paid for ${year}`);
                  },
                  onError: (e) =>
                    toast.error(e instanceof Error ? e.message : "Could not save that"),
                },
              );
            }}
          >
            {save.isPending ? "Saving" : "Save"}
          </Button>
        </div>
      </Section>

      {debt.total > 0 ? (
        <Section
          title="Money you owe"
          sub="The same question in a different shape: is it going down."
        >
          <div className="mb-4 flex items-baseline gap-2">
            <span className="text-[26px] font-bold tracking-[-0.034em] text-warning">
              {money(debt.left, currency)}
            </span>
            <span className="text-[13px] text-muted-foreground">
              {debt.left > 0 ? "still owed" : "all clear"}
            </span>
          </div>

          <ProgressBar value={debt.pct} color="var(--hue-orange)" height={8} />

          <div className="mt-2 flex items-baseline justify-between text-xs text-subtle-foreground">
            <span>
              {money(debt.paid, currency)} of {money(debt.total, currency)} paid
            </span>
            <span className="font-semibold text-muted-foreground tabular">
              {Math.round(debt.pct)}%
            </span>
          </div>

          <div className="mt-3.5 border-t border-border-soft pt-3 text-[13px] leading-relaxed text-muted-foreground">
            {debt.left <= 0 ? (
              "Nothing left to pay. The debt envelope stops taking a share."
            ) : debt.months ? (
              <>
                At <b className="font-semibold text-foreground">{money(debt.thisMonthBudget, currency)}</b>{" "}
                a month this clears in about{" "}
                <b className="font-semibold text-foreground">
                  {debt.months} month{debt.months === 1 ? "" : "s"}
                </b>
                .
              </>
            ) : (
              "No monthly amount is set, so there is no date yet."
            )}
          </div>
        </Section>
      ) : null}
    </>
  );
}
