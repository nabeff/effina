"use client";

import { toast } from "sonner";
import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { GoalCard } from "@/components/features/goals/goal-card";
import { GoalTimeline } from "@/components/features/charts/goal-timeline";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useBudget, useBudgetMutation } from "@/lib/hooks/use-budget";
import { patchGoal } from "@/lib/supabase/mutations";
import {
  goalState, goalDone, goalForecast, goalSplit, goalTimeline,
  goalVerdict, savingsPerMonth,
} from "@/lib/budget";
import { money } from "@/lib/utils/money";

const verdictIcon = {
  good: CheckCircle2,
  bad: AlertCircle,
  warn: AlertTriangle,
  neutral: AlertTriangle,
} as const;

const verdictColor = {
  good: "var(--primary)",
  bad: "var(--destructive)",
  warn: "var(--warning)",
  neutral: "var(--muted-foreground)",
} as const;

export default function GoalsPage() {
  const mounted = useMounted();

  const { data, isLoading } = useBudget();

  const setShare = useBudgetMutation(
    async (args: { id: string; share: number }, { supabase }) => {
      await patchGoal(supabase, args.id, { share: args.share });
    },
  );

  if (!mounted || isLoading || !data) {
    return <Skeleton className="h-[400px] rounded-[var(--radius)]" />;
  }

  const currency = data.settings.currency;
  const pool = savingsPerMonth(data);
  const live = data.goals.filter((g) => !goalDone(g));
  const totalPrice = data.goals.reduce((a, g) => a + g.price, 0);
  const totalSaved = data.goals.reduce((a, g) => a + Math.min(g.price, g.saved), 0);
  const totalLeft = Math.max(0, totalPrice - totalSaved);

  const verdict = goalVerdict(data);
  const forecast = goalForecast(data);
  const split = goalSplit(data);
  const timeline = goalTimeline(data, 36);
  const Icon = verdictIcon[verdict.tone];

  return (
    <>
      <section className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Saving a month" value={pool} currency={currency} tone="good"
          delta={
            <span className="text-muted-foreground">
              split across {live.length} goal{live.length === 1 ? "" : "s"}
            </span>
          }
        />
        <Stat
          label="Put away so far" value={totalSaved} currency={currency}
          delta={
            <span className="text-muted-foreground">
              of {money(totalPrice, currency)} in total
            </span>
          }
        />
        <Stat
          label="Still to find" value={totalLeft} currency={currency}
          tone={totalLeft > 0 ? "warn" : "good"}
          delta={
            <span className="text-muted-foreground">
              {pool > 0
                ? `about ${Math.ceil(totalLeft / pool)} months at this rate`
                : "set a saving amount to get a date"}
            </span>
          }
        />
      </section>

      <Section title="Your plan">
        {data.goals.length ? (
          <div className="flex items-start gap-3.5">
            <span
              className="grid size-[34px] flex-none place-items-center rounded-full"
              style={{
                background: `color-mix(in srgb, ${verdictColor[verdict.tone]} 15%, transparent)`,
                color: verdictColor[verdict.tone],
              }}
            >
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15.5px] leading-snug font-semibold tracking-[-0.015em]">
                {verdict.text}
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground">
                You save {money(pool, currency)} a month and still owe {money(totalLeft, currency)}.
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-[15px] font-semibold">No goals yet</p>
            <p className="mx-auto mt-1 max-w-[40ch] text-[13.5px] text-muted-foreground">
              Add what you want with its price and this works out the monthly amount and the date.
            </p>
          </div>
        )}
      </Section>

      {data.goals.length ? (
        <section className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              state={goalState(data, g)}
              when={forecast[g.id]?.when ?? null}
              share={split.find((s) => s.id === g.id)}
              currency={currency}
              onShareChange={(v) => setShare.mutate({ id: g.id, share: v })}
              onAddMoney={() => toast("Adding money arrives with the goal sheet")}
              onEdit={() => toast("Editing arrives with the goal sheet")}
            />
          ))}
        </section>
      ) : null}

      {live.length && pool > 0 ? (
        <Section
          title="When each one lands"
          sub="Each goal as a share of its own price, so a small one is as readable as a big one. Move a slider and these lines move with it."
        >
          <GoalTimeline
            series={timeline.series}
            prices={Object.fromEntries(data.goals.map((g) => [g.id, g.price]))}
            currency={currency}
          />
        </Section>
      ) : null}

      {split.length ? (
        <Section
          title="Where your saving goes"
          sub={`${money(pool, currency)} a month, divided by the shares you set.`}
        >
          <div className="mb-4 flex h-[34px] gap-0.5 overflow-hidden rounded-[9px]">
            {split.map((p) => (
              <span
                key={p.id}
                className="block first:rounded-l-[9px] last:rounded-r-[9px]"
                style={{ flex: p.amount, background: `var(--hue-${p.hue})` }}
                title={`${p.name}: ${money(p.amount, currency)} a month`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            {split.map((p) => (
              <div key={p.id} className="flex items-center gap-2.5 text-[13.5px]">
                <span
                  className="size-[9px] flex-none rounded-[3px]"
                  style={{ background: `var(--hue-${p.hue})` }}
                />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="font-semibold tabular">{money(p.amount, currency)}</span>
                <span className="w-11 text-right text-xs text-subtle-foreground tabular">
                  {Math.round(p.pct)}%
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {timeline.finished.length ? (
        <Section
          title="The order they arrive"
          sub="Finishing one releases its share to the rest, which speeds up everything after it."
          pad={false}
        >
          <div className="flex flex-col divide-y divide-border-soft">
            {timeline.finished.map((f, i) => (
              <div key={f.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-[22px] flex-none place-items-center rounded-full bg-fill-2 text-[11.5px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className="size-[9px] flex-none rounded-[3px]"
                  style={{ background: `var(--hue-${f.hue})` }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-medium">{f.name}</div>
                  <div className="mt-px text-xs text-subtle-foreground">
                    {f.month === 1 ? "next month" : `in about ${f.month} months`}
                  </div>
                </div>
                <span className="flex-none text-[13px] font-semibold text-muted-foreground tabular">
                  {f.when}
                </span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
