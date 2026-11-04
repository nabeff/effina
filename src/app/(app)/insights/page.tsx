"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle, Archive, ArrowDownToLine, CheckCircle2, ChartPie,
  Percent, TrendingUp, type LucideIcon,
} from "lucide-react";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useMonth } from "@/lib/hooks/use-budget";
import { useShell } from "@/lib/hooks/use-shell";
import { notices } from "@/lib/budget";
import { money } from "@/lib/utils/money";
import type { Tone } from "@/types/budget";

const icons: Record<string, LucideIcon> = {
  archive: Archive,
  "alert-circle": AlertCircle,
  "trending-up": TrendingUp,
  percent: Percent,
  "arrow-down-to-line": ArrowDownToLine,
  "pie-chart": ChartPie,
  "check-circle-2": CheckCircle2,
};

const routes: Record<string, string> = {
  close: "/history",
  rebalance: "/rebalance",
  tax: "/tax",
  setup: "/setup",
  envelopes: "/envelopes",
  nospend: "/log",
  backup: "/setup",
};

const toneColor: Record<Tone, string> = {
  bad: "var(--destructive)",
  warn: "var(--warning)",
  good: "var(--primary)",
  neutral: "var(--muted-foreground)",
};

export default function InsightsPage() {
  const mounted = useMounted();

  /* the header owns which month is on screen */
  const { month } = useShell();
  const { data, stats: st } = useMonth(mounted ? month : SKIP);

  const list = useMemo(
    () =>
      data && st
        ? notices(data, st, { currency: data.settings.currency, backupDays: undefined })
        : [],
    [data, st],
  );

  if (!mounted || !data || !st) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;
  const problems = list.filter((n) => n.tone !== "good");
  const wins = list.filter((n) => n.tone === "good");

  /* where the money actually goes, biggest first */
  const spenders = [...st.envRows]
    .filter((r) => r.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 6);
  const biggest = spenders[0];
  const topSpend = biggest ? biggest.spent : 0;

  const savedPct = st.income > 0 ? (st.saved / st.income) * 100 : 0;
  const billPct = st.income > 0 ? (st.billTotal / st.income) * 100 : 0;

  return (
    <>
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Things to look at" value={problems.length} currency=""
          tone={problems.length ? "warn" : "good"}
          delta={
            <span className="text-muted-foreground">
              {problems.length ? "worth a minute" : "nothing needs you"}
            </span>
          }
        />
        <Stat
          label="Goes to saving" value={Math.round(savedPct)} currency="%"
          tone={savedPct >= 20 ? "good" : "warn"}
          delta={<span className="text-muted-foreground">of what you earn</span>}
        />
        <Stat
          label="Committed to bills" value={Math.round(billPct)} currency="%"
          tone={billPct > 50 ? "warn" : "neutral"}
          delta={<span className="text-muted-foreground">before you spend anything</span>}
        />
      </section>

      <Section
        title="What needs you"
        sub={problems.length ? "Worst first." : undefined}
        pad={problems.length === 0}
      >
        {problems.length ? (
          <div className="flex flex-col divide-y divide-border-soft">
            {problems.map((n) => {
              const Icon = icons[n.icon] ?? AlertCircle;
              const href = routes[n.action] ?? "/";
              return (
                <Link
                  key={n.id}
                  href={href}
                  className="flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-fill-2"
                >
                  <span
                    className="grid size-[30px] flex-none place-items-center rounded-full"
                    style={{
                      background: `color-mix(in srgb, ${toneColor[n.tone]} 15%, transparent)`,
                      color: toneColor[n.tone],
                    }}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold">{n.title}</div>
                    <div className="mt-0.5 text-[13px] text-muted-foreground">{n.text}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center">
            <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
              <CheckCircle2 className="size-[22px]" />
            </span>
            <p className="text-[15px] font-semibold">Nothing needs you</p>
            <p className="mx-auto mt-1 max-w-[42ch] text-[13.5px] text-muted-foreground">
              No envelope is over, the tax reserve covers what you owe, and the month is on track.
            </p>
          </div>
        )}
      </Section>

      {spenders.length ? (
        <Section
          title="Where it goes"
          sub="Your biggest envelopes this month, by what you actually spent."
        >
          <div className="flex flex-col gap-3.5">
            {spenders.map((r) => (
              <div key={r.id}>
                <div className="mb-1.5 flex items-baseline gap-2 text-[13.5px]">
                  <span
                    className="size-[9px] flex-none rounded-[3px]"
                    style={{ background: `var(--hue-${r.hue})` }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                  <span className="font-semibold tabular">{money(r.spent, currency)}</span>
                  <span className="w-12 text-right text-xs text-subtle-foreground tabular">
                    {st.spent > 0 ? Math.round((r.spent / st.spent) * 100) : 0}%
                  </span>
                </div>
                <ProgressBar
                  value={topSpend > 0 ? (r.spent / topSpend) * 100 : 0}
                  color={`var(--hue-${r.hue})`}
                  height={5}
                />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {wins.length ? (
        <Section title="Good news" pad={false}>
          <div className="flex flex-col divide-y divide-border-soft">
            {wins.map((n) => (
              <div key={n.id} className="flex items-start gap-3.5 px-5 py-4">
                <span className="grid size-[30px] flex-none place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-primary">
                  <CheckCircle2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-semibold">{n.title}</div>
                  <div className="mt-0.5 text-[13px] text-muted-foreground">{n.text}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
