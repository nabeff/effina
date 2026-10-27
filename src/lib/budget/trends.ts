/**
 * Figures that compare one stretch of time with another.
 *
 * Everything here is pure, and every function returns null rather
 * than a number when there is not enough history to be honest
 * about. A made up trend is worse than no trend.
 */

import type { BudgetData } from "@/types/budget";
import { isoDate, shiftMonth, thisMonth } from "./timing";
import { stats } from "./stats";

export interface FlowPoint {
  month: string;
  label: string;
  income: number;
  out: number;
  net: number;
  /** a month still running, so its bar is not comparable yet */
  partial: boolean;
}

/**
 * Money in against money out, month by month. Closed months use
 * their filed totals, live months are computed.
 */
export function cashFlow(
  data: BudgetData,
  months = 6,
  now: Date = new Date(),
): FlowPoint[] {
  const out: FlowPoint[] = [];
  const cur = thisMonth(now);

  for (let i = months - 1; i >= 0; i--) {
    const month = shiftMonth(cur, -i);
    const closed = data.closedMonths.find((c) => c.month === month);
    const [y, m] = month.split("-").map(Number);

    const income = closed ? closed.income : stats(data, month, now).income;
    const spent = closed ? closed.spent : stats(data, month, now).spent;

    out.push({
      month,
      label: new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short" }),
      income,
      out: spent,
      net: income - spent,
      partial: !closed && month === cur,
    });
  }

  return out;
}

/** What share of income is kept, as a percentage. */
export function savingsRate(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
): number | null {
  const st = stats(data, month, now);
  if (st.income <= 0) return null;
  return (st.saved / st.income) * 100;
}

export interface CategorySlice {
  id: string;
  name: string;
  hue: string;
  spent: number;
  pct: number;
}

/** Where the money actually went this month, biggest first. */
export function spendByCategory(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
): CategorySlice[] {
  const st = stats(data, month, now);
  const total = st.envRows.reduce((a, r) => a + r.spent, 0);
  if (total <= 0) return [];

  return st.envRows
    .filter((r) => r.spent > 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      hue: r.hue,
      spent: r.spent,
      pct: (r.spent / total) * 100,
    }))
    .sort((a, b) => b.spent - a.spent);
}

export interface Insight {
  id: string;
  text: string;
  tone: "good" | "warn" | "neutral";
}

function spentBetween(
  data: BudgetData,
  from: Date,
  to: Date,
  envelopeId?: string,
): number {
  const a = isoDate(from);
  const b = isoDate(to);
  return data.transactions
    .filter(
      (t) =>
        t.direction === "out" &&
        !t.billId &&
        t.date >= a &&
        t.date <= b &&
        (!envelopeId || t.envelopeId === envelopeId),
    )
    .reduce((acc, t) => acc + t.amount, 0);
}

/**
 * Short observations worth reading, each one a real comparison
 * rather than a restatement of a figure already on screen.
 */
export function insights(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
): Insight[] {
  const out: Insight[] = [];
  const day = 86400000;

  const weekEnd = new Date(now);
  const weekStart = new Date(now.getTime() - 6 * day);
  const prevEnd = new Date(now.getTime() - 7 * day);
  const prevStart = new Date(now.getTime() - 13 * day);

  /* a week against the week before it, per envelope */
  for (const env of data.envelopes) {
    if (env.kind !== "spend") continue;
    const nowSpent = spentBetween(data, weekStart, weekEnd, env.id);
    const wasSpent = spentBetween(data, prevStart, prevEnd, env.id);

    /* both weeks need real activity, or the percentage is noise */
    if (wasSpent < 100 || nowSpent < 100) continue;

    const change = ((nowSpent - wasSpent) / wasSpent) * 100;
    if (Math.abs(change) < 20) continue;

    out.push({
      id: `week:${env.id}`,
      tone: change > 0 ? "warn" : "good",
      text:
        change > 0
          ? `You spent ${Math.round(change)}% more on ${env.name} this week.`
          : `You spent ${Math.round(-change)}% less on ${env.name} this week.`,
    });
  }

  /* this month against the last closed one */
  const prevMonth = shiftMonth(month, -1);
  const closed = data.closedMonths.find((c) => c.month === prevMonth);
  const st = stats(data, month, now);

  if (closed && closed.spent > 0 && st.daysTotal > 0) {
    /* projected from the pace so far, since a part month cannot
       be compared with a whole one */
    const elapsed = Math.max(1, st.daysTotal - st.daysLeft);
    const projected = (st.spent / elapsed) * st.daysTotal;
    const change = ((projected - closed.spent) / closed.spent) * 100;

    if (Math.abs(change) >= 10) {
      out.push({
        id: "month",
        tone: change > 0 ? "warn" : "good",
        text:
          change > 0
            ? `At this pace you will spend ${Math.round(change)}% more than last month.`
            : `At this pace you will spend ${Math.round(-change)}% less than last month.`,
      });
    }
  }

  const rate = savingsRate(data, month, now);
  if (rate !== null && rate >= 20) {
    out.push({
      id: "rate",
      tone: "good",
      text: `You are keeping ${Math.round(rate)}% of what you earn.`,
    });
  }

  return out.slice(0, 4);
}

/** Last month's totals, for the stat cards to compare against. */
export function lastMonth(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
) {
  const prev = shiftMonth(month, -1);
  const closed = data.closedMonths.find((c) => c.month === prev);
  if (closed) {
    return { income: closed.income, spent: closed.spent, saved: closed.saved };
  }

  const any = data.transactions.some((t) => t.date.startsWith(prev));
  if (!any) return null;

  const st = stats(data, prev, now);
  return { income: st.income, spent: st.spent, saved: st.saved };
}

/** Bills due in the next stretch of days, soonest first. */
export function upcomingBills(
  data: BudgetData,
  month: string,
  withinDays = 14,
  now: Date = new Date(),
) {
  const st = stats(data, month, now);
  if (st.future || st.closed) return [];

  const today = now.getDate();

  return st.billRows
    .filter((b) => !b.paid)
    .map((b) => {
      const day = Math.min(Math.max(1, b.dueDay), st.daysTotal);
      return { ...b, day, inDays: day - today };
    })
    .filter((b) => b.inDays <= withinDays)
    .sort((a, b) => a.inDays - b.inDays);
}
