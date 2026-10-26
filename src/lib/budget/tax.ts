/**
 * Tax reserve.
 *
 * The reserve is just an envelope taking its percentage every
 * month. Nothing special happens, the app only tracks whether
 * what has accumulated will cover what is owed.
 */

import type { BudgetData } from "@/types/budget";
import { stats } from "./stats";

export function taxYear(month: string): string {
  return month.slice(0, 4);
}

export function incomeForYear(data: BudgetData, year: string): number {
  const closedKeys = new Set(data.closedMonths.map((c) => c.month));

  const fromClosed = data.closedMonths
    .filter((c) => c.month.startsWith(year))
    .reduce((a, c) => a + c.income, 0);

  const live = data.transactions
    .filter(
      (t) =>
        t.direction === "in" &&
        t.date.startsWith(year) &&
        !closedKeys.has(t.date.slice(0, 7)),
    )
    .reduce((a, t) => a + t.amount, 0);

  return fromClosed + live;
}

/** Everything sitting in the tax envelope across the year. */
export function taxSetAside(
  data: BudgetData,
  year: string,
  now: Date = new Date(),
): number {
  const tax = data.envelopes.find(
    (e) => e.kind === "save" && e.name.toLowerCase().includes("tax"),
  );
  if (!tax) return 0;

  const fromClosed = data.closedMonths
    .filter((c) => c.month.startsWith(year))
    .reduce((a, c) => a + (c.perEnvelope[tax.id] ?? 0), 0);

  /* live months count what is still unspent in the envelope */
  const months = new Set(
    data.transactions
      .filter((t) => t.date.startsWith(year))
      .map((t) => t.date.slice(0, 7)),
  );
  const closedKeys = new Set(data.closedMonths.map((c) => c.month));

  let live = 0;
  for (const m of months) {
    if (closedKeys.has(m)) continue;
    const row = stats(data, m, now).envRows.find((r) => r.id === tax.id);
    if (row) live += Math.max(0, row.planned - row.spent);
  }

  return fromClosed + live;
}

export interface TaxState {
  year: string;
  rate: number;
  income: number;
  owed: number;
  paid: number;
  left: number;
  aside: number;
  gap: number;
  covered: number;
  ok: boolean;
  short: number;
}

export function taxState(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
): TaxState {
  const year = taxYear(month);
  const rate = data.settings.taxRate || 0;
  const income = incomeForYear(data, year);
  const owed = (income * rate) / 100;
  const paid = data.settings.taxPaid[year] ?? 0;
  const left = Math.max(0, owed - paid);
  const aside = taxSetAside(data, year, now);
  const gap = aside - left;

  return {
    year, rate, income, owed, paid, left, aside, gap,
    covered: left <= 0 ? 100 : Math.max(0, Math.min(100, (aside / left) * 100)),
    ok: gap >= -0.5,
    short: Math.max(0, -gap),
  };
}

/** Debt progress, which is the same shape of question. */
export function debtState(data: BudgetData, month: string, now: Date = new Date()) {
  const total = data.settings.debtTotal || 0;
  const st = stats(data, month, now);
  const row = st.envRows.find((r) => r.kind === "debt");

  const closedPaid = data.closedMonths.reduce((a, c) => a + c.debtPaid, 0);
  const closedKeys = new Set(data.closedMonths.map((c) => c.month));
  const live = row
    ? data.transactions
        .filter(
          (t) =>
            t.direction === "out" &&
            t.envelopeId === row.id &&
            !closedKeys.has(t.date.slice(0, 7)),
        )
        .reduce((a, t) => a + t.amount, 0)
    : 0;

  const paid = Math.min(total, (data.settings.debtPaidBefore || 0) + closedPaid + live);
  const left = Math.max(0, total - paid);
  const thisMonthBudget = row?.planned ?? 0;

  return {
    total, paid, left,
    pct: total > 0 ? (paid / total) * 100 : 0,
    thisMonthBudget,
    suggested: Math.min(left, Math.max(0, row?.left ?? 0)),
    months: thisMonthBudget > 0 ? Math.ceil(left / thisMonthBudget) : null,
  };
}
