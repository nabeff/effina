/**
 * Figures the home page asks for and nothing else does.
 *
 * Same rule as the rest of this layer: data in, numbers out, no
 * React and no Supabase.
 */

import type { BudgetData, MonthStats } from "@/types/budget";
import { isoDate } from "./timing";
import { goalDone, goalState, savingsPerMonth } from "./goals";
import { debtState } from "./tax";

export interface StripDay {
  date: string;
  label: string;
  spent: number;
  /* 0 to 4, so the strip reads as a shape rather than exact figures */
  level: number;
  today: boolean;
}

/**
 * The last N days of spending as a row of blocks. Bills are left
 * out because they are the same every month and would flatten
 * every other day into nothing.
 */
export function dayStrip(
  data: BudgetData,
  days = 30,
  now: Date = new Date(),
): StripDay[] {
  const out: StripDay[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = isoDate(d);
    const spent = data.transactions
      .filter((t) => t.direction === "out" && t.date === key && !t.billId)
      .reduce((a, t) => a + t.amount, 0);

    out.push({
      date: key,
      spent,
      level: 0,
      today: i === 0,
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    });
  }

  const top = Math.max(0, ...out.map((o) => o.spent));
  for (const o of out) {
    o.level = top > 0 ? Math.round((o.spent / top) * 4) : 0;
    /* any spending at all should show, however small against the peak */
    if (o.spent > 0 && o.level === 0) o.level = 1;
  }
  return out;
}

export interface Win {
  kind: "goal" | "debt";
  name: string;
  left: number;
  months: number | null;
  when: string;
  text: string;
}

/**
 * The nearest finish line, so there is always one thing close
 * enough to be worth looking at.
 */
export function nextWin(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
): Win | null {
  let best: { kind: "goal" | "debt"; name: string; left: number; months: number | null } | null = null;

  for (const g of data.goals) {
    if (goalDone(g)) continue;
    const gs = goalState(data, g, now);
    if (gs.left <= 0) continue;
    if (!best || gs.left < best.left) {
      best = { kind: "goal", name: g.name, left: gs.left, months: gs.months };
    }
  }

  const debt = debtState(data, month, now);
  if (debt.left > 0 && (!best || debt.left < best.left)) {
    const row = data.envelopes.find((e) => e.kind === "debt");
    best = { kind: "debt", name: row?.name ?? "Debt", left: debt.left, months: debt.months };
  }

  if (!best) return null;

  /* weeks read better than "1 month" when the finish line is close */
  const m = best.months;
  let when = "";
  if (m != null && m > 0) {
    when = m === 1 ? "about 4 weeks" : `about ${m} months`;
    if (m === 1) {
      const perWeek = savingsPerMonth(data) / 4;
      const weeks = perWeek > 0 ? Math.max(1, Math.round(best.left / perWeek)) : 0;
      if (weeks > 0 && weeks < 4) when = `about ${weeks} week${weeks === 1 ? "" : "s"}`;
    }
  }

  const amount = `${Math.round(best.left).toLocaleString("en-US")} ${data.settings.currency}`;
  return {
    ...best,
    when,
    text: `${best.name}: ${amount} to go${when ? `, ${when}` : ""}`,
  };
}

/** The last few things logged, for the "again" shortcuts. */
export function recentSpends(data: BudgetData, count = 3) {
  return data.transactions
    .filter((t) => t.direction === "out" && !t.billId && t.envelopeId)
    .slice(0, count);
}

/** How the month is tracking, as one short line. */
export function paceLine(st: MonthStats, currency: string): string {
  if (st.future) return "This month has not started yet.";
  if (st.closed) return "This month is closed.";
  if (st.daysLeft <= 0) return "Last day of the month.";

  const perDay = Math.round(st.leftToSpend / st.daysLeft);
  const amount = `${Math.max(0, perDay).toLocaleString("en-US")} ${currency}`;
  return st.leftToSpend <= 0
    ? "Nothing left in the spending envelopes."
    : `${amount} a day for the next ${st.daysLeft} day${st.daysLeft === 1 ? "" : "s"}.`;
}
