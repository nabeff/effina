"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownRight, ArrowUpRight, CalendarClock, Lightbulb,
  PiggyBank, Scale, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import { Money } from "@/components/ui/money";
import { ProgressBar } from "@/components/ui/progress-bar";
import { cn } from "@/lib/utils";
import { money, money0, ordinal } from "@/lib/utils/money";
import type { BudgetData, MonthStats } from "@/types/budget";
import {
  goalDone, goalState, insights, planMoves, savingsRate,
  spendByCategory, upcomingBills,
} from "@/lib/budget";

/** The shared card shell, so every widget sits on the same ground. */
export function Card({
  title, sub, children, href, className,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  const body = (
    <div
      className={cn(
        "h-full rounded-[var(--radius)] bg-card px-[17px] pt-[15px] pb-[17px]",
        href && "transition-colors hover:bg-card-2",
        className,
      )}
    >
      <div className="mb-3">
        <div className="text-xs font-semibold tracking-[0.01em] text-muted-foreground">
          {title}
        </div>
        {sub ? (
          <div className="mt-0.5 text-[11.5px] text-subtle-foreground">{sub}</div>
        ) : null}
      </div>
      {children}
    </div>
  );

  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-5 text-center text-[13px] leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

/* ---- total balance ---- */
export function BalanceWidget({ st, currency }: { st: MonthStats; currency: string }) {
  return (
    <Card title="Total balance" sub="What is still yours this month">
      <div className="text-[clamp(26px,4vw,34px)] leading-none font-bold tracking-[-0.036em]">
        <Money value={st.leftToSpend} currency={currency} />
      </div>
      <div className="mt-3.5 flex flex-col gap-2">
        <Row label="Bills still to pay" value={st.billTotal - st.billsPaid} currency={currency} />
        <Row label="Put into savings" value={st.inSavePots} currency={currency} tone="good" />
        {Math.abs(st.unassigned) > 1 ? (
          <Row label="Not yet assigned" value={st.unassigned} currency={currency} />
        ) : null}
      </div>
    </Card>
  );
}

function Row({
  label, value, currency, tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone?: "good";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-[13px]">
      <span className="min-w-0 truncate text-muted-foreground">{label}</span>
      <span className={cn("flex-none font-semibold tabular", tone === "good" && "text-primary")}>
        {money(value, currency)}
      </span>
    </div>
  );
}

/* ---- daily allowance ---- */
export function AllowanceWidget({ st, currency }: { st: MonthStats; currency: string }) {
  if (st.future || st.closed || st.daysLeft <= 0) {
    return (
      <Card title="Daily allowance">
        <Empty>This only means something during a live month.</Empty>
      </Card>
    );
  }

  const perDay = st.leftToSpend / st.daysLeft;
  const today = st.transactions
    .filter((t) => t.direction === "out" && !t.billId && t.date === isoToday())
    .reduce((a, t) => a + t.amount, 0);
  const used = perDay > 0 ? Math.min(100, (today / perDay) * 100) : 0;
  const over = today > perDay;

  return (
    <Card title="Today" sub={`${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"} left this month`}>
      <div className="flex items-baseline gap-2">
        <span className="text-[clamp(26px,4vw,34px)] leading-none font-bold tracking-[-0.036em]">
          <Money value={Math.max(0, perDay - today)} currency={currency} />
        </span>
        <span className="text-[13px] text-muted-foreground">left today</span>
      </div>

      <div className="mt-3.5">
        <ProgressBar
          value={used}
          color={over ? "var(--destructive)" : "var(--primary)"}
          height={6}
        />
        <div className="mt-2 flex items-baseline justify-between text-[12px] text-subtle-foreground">
          <span>{money0(today)} spent</span>
          <span>{money0(perDay)} {currency} a day</span>
        </div>
      </div>
    </Card>
  );
}

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ---- savings rate ---- */
export function RateWidget({
  data, st, currency,
}: {
  data: BudgetData;
  st: MonthStats;
  currency: string;
}) {
  const rate = savingsRate(data, st.month);

  if (rate === null) {
    return (
      <Card title="Savings rate">
        <Empty>Log some income and this works out the share you keep.</Empty>
      </Card>
    );
  }

  const good = rate >= 20;

  return (
    <Card title="Savings rate" sub="A fifth of your income is the usual target">
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-[clamp(26px,4vw,34px)] leading-none font-bold tracking-[-0.036em] tabular",
            good ? "text-primary" : "text-warning",
          )}
        >
          {Math.round(rate)}%
        </span>
        <span className="text-[13px] text-muted-foreground">of what you earn</span>
      </div>

      <div className="mt-3.5">
        <ProgressBar
          value={Math.min(100, rate)}
          color={good ? "var(--primary)" : "var(--warning)"}
          height={6}
          /* the target, so the bar has something to beat */
          marker={20}
        />
        <div className="mt-2 flex items-baseline justify-between text-[12px] text-subtle-foreground">
          <span>{money(st.saved, currency)} kept</span>
          <span>of {money(st.income, currency)}</span>
        </div>
      </div>
    </Card>
  );
}

/* ---- upcoming bills ---- */
export function BillsWidget({
  data, st, currency,
}: {
  data: BudgetData;
  st: MonthStats;
  currency: string;
}) {
  const due = upcomingBills(data, st.month, 14);

  return (
    <Card title="Upcoming bills" sub="Due in the next two weeks" href="/bills">
      {due.length ? (
        <div className="flex flex-col gap-2.5">
          {due.slice(0, 5).map((b) => (
            <div key={b.id} className="flex items-center gap-2.5 text-[13.5px]">
              <CalendarClock
                className={cn(
                  "size-3.5 flex-none",
                  b.inDays < 0 ? "text-warning" : "text-subtle-foreground",
                )}
              />
              <span className="min-w-0 flex-1 truncate">{b.name}</span>
              <span className="flex-none text-[12px] text-subtle-foreground">
                {b.inDays < 0
                  ? "overdue"
                  : b.inDays === 0
                    ? "today"
                    : `the ${ordinal(b.day)}`}
              </span>
              <span className="flex-none font-semibold tabular">
                {money(b.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Nothing due in the next two weeks.</Empty>
      )}
    </Card>
  );
}

/* ---- envelopes overview ---- */
export function EnvelopesWidget({ st, currency }: { st: MonthStats; currency: string }) {
  const rows = [...st.envRows]
    .filter((r) => r.planned > 0)
    .sort((a, b) => a.left - b.left)
    .slice(0, 6);

  return (
    <Card title="Envelopes" sub="Tightest first" href="/envelopes">
      {rows.length ? (
        <div className="flex flex-col gap-3">
          {rows.map((r) => {
            const over = r.left < -0.5;
            const used = r.planned > 0 ? Math.min(100, (r.spent / r.planned) * 100) : 0;
            return (
              <div key={r.id}>
                <div className="mb-1.5 flex items-baseline gap-2 text-[13px]">
                  <span
                    className="size-[8px] flex-none rounded-[2px]"
                    style={{ background: `var(--hue-${r.hue})` }}
                  />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  <span
                    className={cn(
                      "flex-none font-semibold tabular",
                      over && "text-destructive",
                    )}
                  >
                    {over ? `${money(-r.left, currency)} over` : money(r.left, currency)}
                  </span>
                </div>
                <ProgressBar
                  value={over ? 100 : used}
                  color={over ? "var(--destructive)" : `var(--hue-${r.hue})`}
                  height={4}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>No envelopes yet.</Empty>
      )}
    </Card>
  );
}

/* ---- goals progress ---- */
export function GoalsWidget({
  data, currency,
}: {
  data: BudgetData;
  currency: string;
}) {
  const live = data.goals.filter((g) => !goalDone(g)).slice(0, 4);

  return (
    <Card title="Goals" sub="What you are saving for" href="/goals">
      {live.length ? (
        <div className="flex flex-col gap-3">
          {live.map((g) => {
            const gs = goalState(data, g);
            return (
              <div key={g.id}>
                <div className="mb-1.5 flex items-baseline gap-2 text-[13px]">
                  <span
                    className="size-[8px] flex-none rounded-[2px]"
                    style={{ background: `var(--hue-${g.hue})` }}
                  />
                  <span className="min-w-0 flex-1 truncate">{g.name}</span>
                  <span className="flex-none font-semibold tabular">
                    {money(gs.left, currency)} to go
                  </span>
                </div>
                <ProgressBar
                  value={gs.pct}
                  color={`var(--hue-${g.hue})`}
                  height={4}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <Empty>No goals yet. Add one and this tracks the date for you.</Empty>
      )}
    </Card>
  );
}

/* ---- spending by envelope ---- */
export function CategoryWidget({
  data, st, currency,
}: {
  data: BudgetData;
  st: MonthStats;
  currency: string;
}) {
  const cats = spendByCategory(data, st.month).slice(0, 6);
  const top = cats[0]?.spent ?? 0;

  return (
    <Card title="Where it went" sub="This month, biggest first">
      {cats.length ? (
        <div className="flex flex-col gap-3">
          {cats.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <div className="mb-1.5 flex items-baseline gap-2 text-[13px]">
                <span
                  className="size-[8px] flex-none rounded-[2px]"
                  style={{ background: `var(--hue-${c.hue})` }}
                />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="flex-none font-semibold tabular">
                  {money(c.spent, currency)}
                </span>
                <span className="w-9 flex-none text-right text-[11.5px] text-subtle-foreground tabular">
                  {Math.round(c.pct)}%
                </span>
              </div>
              <ProgressBar
                value={top > 0 ? (c.spent / top) * 100 : 0}
                color={`var(--hue-${c.hue})`}
                height={4}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <Empty>Nothing spent yet this month.</Empty>
      )}
    </Card>
  );
}

/* ---- insights ---- */
export function InsightsWidget({
  data, st,
}: {
  data: BudgetData;
  st: MonthStats;
}) {
  const list = insights(data, st.month);

  return (
    <Card title="Worth knowing" sub="This week against last">
      {list.length ? (
        <div className="flex flex-col gap-2.5">
          {list.map((n, i) => {
            const Icon =
              n.tone === "good" ? TrendingDown : n.tone === "warn" ? TrendingUp : Lightbulb;
            const color =
              n.tone === "good"
                ? "var(--primary)"
                : n.tone === "warn"
                  ? "var(--warning)"
                  : "var(--muted-foreground)";
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className="flex items-start gap-2.5 text-[13px] leading-relaxed"
              >
                <Icon className="mt-px size-3.5 flex-none" style={{ color }} />
                <span className="min-w-0 flex-1">{n.text}</span>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Empty>
          Not enough history yet. These start once there are two weeks to compare.
        </Empty>
      )}
    </Card>
  );
}

/* ---- rebalance suggestions ---- */
export function RebalanceWidget({ st, currency }: { st: MonthStats; currency: string }) {
  const plan = planMoves(st);
  const movable = plan.moves.filter((m) => m.from);

  return (
    <Card title="Rebalance" sub="What to move, and from where" href="/rebalance">
      {movable.length ? (
        <div className="flex flex-col gap-2.5">
          {movable.slice(0, 4).map((m, i) => (
            <div key={`${m.to.id}-${i}`} className="flex items-center gap-2 text-[13px]">
              <span
                className="size-[8px] flex-none rounded-[2px]"
                style={{ background: `var(--hue-${m.from!.hue})` }}
              />
              <span className="min-w-0 truncate">{m.from!.name}</span>
              <ArrowUpRight className="size-3 flex-none rotate-45 text-subtle-foreground" />
              <span
                className="size-[8px] flex-none rounded-[2px]"
                style={{ background: `var(--hue-${m.to.hue})` }}
              />
              <span className="min-w-0 flex-1 truncate">{m.to.name}</span>
              <span className="flex-none font-semibold tabular">
                {money(m.amount, currency)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Nothing is over. There is nothing to move.</Empty>
      )}
    </Card>
  );
}

/* ---- the old bills, debt and tax trio ---- */
export function TrioWidget({
  st, currency, debtLeft, taxShort,
}: {
  st: MonthStats;
  currency: string;
  debtLeft: number;
  taxShort: number;
}) {
  const items = [
    {
      id: "bills", icon: Wallet, href: "/bills",
      label: "Bills", value: st.billTotal - st.billsPaid,
      note: st.billsPaid >= st.billTotal ? "all paid" : "still to pay",
      tone: st.billsPaid >= st.billTotal ? "good" : "warn",
    },
    {
      id: "debt", icon: ArrowDownRight, href: "/tax",
      label: "Money you owe", value: debtLeft,
      note: debtLeft > 0 ? "still owed" : "all clear",
      tone: debtLeft > 0 ? "warn" : "good",
    },
    {
      id: "tax", icon: PiggyBank, href: "/tax",
      label: "Tax reserve", value: taxShort,
      note: taxShort > 0 ? "short" : "covered",
      tone: taxShort > 0 ? "bad" : "good",
    },
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map(({ id, icon: Icon, href, label, value, note, tone }) => (
        <Link
          key={id}
          href={href}
          className="rounded-[var(--radius)] bg-card px-[17px] py-[15px] transition-colors hover:bg-card-2"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Icon className="size-3.5" />
            {label}
          </div>
          <div
            className={cn(
              "mt-1.5 text-[22px] leading-none font-bold tracking-[-0.03em]",
              tone === "good" && "text-primary",
              tone === "warn" && "text-warning",
              tone === "bad" && "text-destructive",
            )}
          >
            <Money value={value} currency={currency} />
          </div>
          <div className="mt-1 text-[12px] text-subtle-foreground">{note}</div>
        </Link>
      ))}
    </div>
  );
}

/* ---- rebalance badge for the scale icon, kept near its widget ---- */
export { Scale };
