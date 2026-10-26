"use client";

import { useMounted } from "@/lib/hooks/use-mounted";
import { SKIP, useMonth } from "@/lib/hooks/use-budget";
import { HeroCard } from "@/components/features/dashboard/hero-card";
import { SplitBar } from "@/components/features/dashboard/split-bar";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { money } from "@/lib/utils/money";

export default function DashboardPage() {
  /* today differs between the build and the browser, so the month
     is only resolved once mounted */
  const mounted = useMounted();

  const { data, stats: st, isLoading } = useMonth(mounted ? undefined : SKIP);

  if (!mounted || isLoading || !data || !st) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[200px] rounded-[var(--radius)]" />
        <Skeleton className="h-[140px] rounded-[var(--radius)]" />
      </div>
    );
  }

  const currency = data.settings.currency;

  return (
    <>
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
        <Stat label={st.future ? "Would keep" : "Kept"} value={st.saved} currency={currency} tone="good" />
      </section>
    </>
  );
}
