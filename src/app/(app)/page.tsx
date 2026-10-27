"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, CheckCircle2, TriangleAlert } from "lucide-react";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useBudgetMutation, useMonth } from "@/lib/hooks/use-budget";
import { addTransaction } from "@/lib/supabase/mutations";
import { HeroCard } from "@/components/features/dashboard/hero-card";
import { SplitBar } from "@/components/features/dashboard/split-bar";
import { DayStrip } from "@/components/features/dashboard/day-strip";
import { NextWin } from "@/components/features/dashboard/next-win";
import { RecentSpends } from "@/components/features/dashboard/recent-spends";
import { PaceChart } from "@/components/features/charts/pace-chart";
import { EnvelopeDonut } from "@/components/features/charts/envelope-donut";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import {
  dayStrip, goalState, nextWin, notices, recentSpends, todayISO,
} from "@/lib/budget";
import { tap } from "@/components/layout/native";
import { money } from "@/lib/utils/money";
import type { Tone, Transaction } from "@/types/budget";

const noticeIcon = {
  bad: AlertCircle,
  warn: TriangleAlert,
  good: CheckCircle2,
  neutral: TriangleAlert,
} as const;

const noticeColor: Record<Tone, string> = {
  bad: "var(--destructive)",
  warn: "var(--warning)",
  good: "var(--primary)",
  neutral: "var(--muted-foreground)",
};

const routes: Record<string, string> = {
  close: "/history", rebalance: "/rebalance", tax: "/tax",
  setup: "/setup", envelopes: "/envelopes", nospend: "/log", backup: "/setup",
};

export default function DashboardPage() {
  /* today differs between the build and the browser, so the month
     is only resolved once mounted */
  const mounted = useMounted();
  const { data, stats: st, isLoading } = useMonth(mounted ? undefined : SKIP);
  const [repeating, setRepeating] = useState<string | null>(null);

  const again = useBudgetMutation(
    async (tx: Transaction, { userId, supabase }) => {
      await addTransaction(supabase, userId, {
        date: todayISO(),
        direction: "out",
        amount: tx.amount,
        envelopeId: tx.envelopeId,
        note: tx.note,
      });
    },
  );

  const warnings = useMemo(
    () =>
      data && st
        ? notices(data, st, { currency: data.settings.currency })
            .filter((n) => n.tone !== "good")
            .slice(0, 2)
        : [],
    [data, st],
  );

  if (!mounted || isLoading || !data || !st) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[200px] rounded-[var(--radius)]" />
        <Skeleton className="h-[140px] rounded-[var(--radius)]" />
      </div>
    );
  }

  const currency = data.settings.currency;
  const strip = dayStrip(data, 30);
  const win = nextWin(data, st.month);
  const recent = recentSpends(data, 3);

  /* the bar needs the whole price, which only the goal knows.
     Matched by name because that is what nextWin carries, so a
     missing match falls back to no bar rather than throwing. */
  const winGoal = win?.kind === "goal"
    ? data.goals.find((g) => g.name === win.name)
    : undefined;
  const winTotal = win
    ? win.kind === "goal"
      ? (winGoal ? goalState(data, winGoal).price : 0)
      : data.settings.debtTotal
    : 0;

  function repeat(tx: Transaction) {
    setRepeating(tx.id);
    again.mutate(tx, {
      onSuccess: () => {
        setRepeating(null);
        void tap();
        toast.success(`${money(tx.amount, currency)} logged again`);
      },
      onError: (e) => {
        setRepeating(null);
        toast.error(e instanceof Error ? e.message : "Could not log that");
      },
    });
  }

  return (
    <>
      {warnings.length ? (
        <section className="mb-6 flex flex-col gap-2">
          {warnings.map((n) => {
            const Icon = noticeIcon[n.tone];
            return (
              <Link
                key={n.id}
                href={routes[n.action] ?? "/"}
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 transition-opacity hover:opacity-80"
                style={{
                  background: `color-mix(in srgb, ${noticeColor[n.tone]} 11%, transparent)`,
                }}
              >
                <Icon className="size-4 flex-none" style={{ color: noticeColor[n.tone] }} />
                <span className="min-w-0 flex-1 text-[13.5px] leading-snug">
                  <b className="font-semibold">{n.title}.</b>{" "}
                  <span className="text-muted-foreground">{n.text}</span>
                </span>
                <ArrowRight className="size-4 flex-none text-subtle-foreground" />
              </Link>
            );
          })}
        </section>
      ) : null}

      <div data-tour="hero">
        <HeroCard data={data} st={st} />
      </div>

      <Section
        title={`Your ${money(st.base, currency)}`}
        sub={
          st.future
            ? "How this month would be divided"
            : "Where this month's money sits right now"
        }
      >
        <div data-tour="split">
          <SplitBar st={st} currency={currency} />
        </div>
      </Section>

      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Money in" value={st.income} currency={currency} />
        <Stat label="Spent" value={st.spent} currency={currency} />
        <Stat
          label={st.future ? "Would keep" : "Kept"}
          value={st.saved} currency={currency} tone="good"
        />
      </section>

      {win || recent.length ? (
        <section className="mb-8 grid items-start gap-3 lg:grid-cols-2">
          {win ? <NextWin win={win} total={winTotal} currency={currency} /> : null}
          {recent.length ? (
            <div className="rounded-[var(--radius)] bg-card px-[17px] py-[15px]">
              <div className="mb-2 text-xs font-semibold tracking-[0.01em] text-muted-foreground">
                Recently
              </div>
              <RecentSpends
                rows={recent}
                data={data}
                onAgain={repeat}
              />
              {repeating ? (
                <p className="mt-2 text-xs text-subtle-foreground">Logging...</p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {!st.future ? (
        <Section
          title="The last 30 days"
          sub="Bills are left out, so this is only what you chose to spend."
        >
          <DayStrip days={strip} currency={currency} />
        </Section>
      ) : null}

      {!st.future && st.flex > 0 ? (
        <Section
          title="Spending against the month"
          sub="The dashed line is an even pace. Above it is ahead of the month, below it is behind."
        >
          <PaceChart data={data} st={st} currency={currency} />
        </Section>
      ) : null}

      <Section
        title="How it is divided"
        sub={`Your ${money(st.flex, currency)} after bills, by envelope.`}
      >
        <EnvelopeDonut st={st} currency={currency} />
      </Section>
    </>
  );
}
