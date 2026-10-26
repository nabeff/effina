/**
 * Dates and the income timing rule.
 *
 * The subtle part of this app: a month does not switch from
 * planned income to real income until it is genuinely settled.
 * Otherwise a half paid month looks like a disaster on the 10th.
 */

import type { BudgetData } from "@/types/budget";

/** YYYY-MM for a date */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** YYYY-MM-DD for a date */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO(now: Date = new Date()): string {
  return isoDate(now);
}

export function thisMonth(now: Date = new Date()): string {
  return monthKey(now);
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/**
 * Days still spendable. A past month has none, the current month
 * counts today as still spendable, and a future month has not
 * started so every day is ahead.
 */
export function daysLeft(month: string, now: Date = new Date()): number {
  const cur = monthKey(now);
  if (month === cur) return daysInMonth(month) - now.getDate() + 1;
  return month > cur ? daysInMonth(month) : 0;
}

export function isFuture(month: string, now: Date = new Date()): boolean {
  return month > monthKey(now);
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + by, 1));
}

export function monthName(month: string, long = false): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(
    "en-GB",
    long ? { month: "long", year: "numeric" } : { month: "short", year: "2-digit" },
  );
}

/* ---- the timing rule ---- */

export function transactionsIn(data: BudgetData, month: string) {
  return data.transactions.filter((t) => t.date.slice(0, 7) === month);
}

export function closedMonth(data: BudgetData, month: string) {
  return data.closedMonths.find((c) => c.month === month) ?? null;
}

export function incomeOf(data: BudgetData, month: string): number {
  const closed = closedMonth(data, month);
  if (closed) return closed.income;
  return transactionsIn(data, month)
    .filter((t) => t.direction === "in")
    .reduce((a, t) => a + t.amount, 0);
}

export function plannedIncome(data: BudgetData): number {
  return data.settings.income || 0;
}

/**
 * Has this month stopped expecting income?
 *
 * A closed month is settled. A future month never is, because
 * nothing has happened yet. Otherwise it is settled when the user
 * says so, or when the month runs out.
 */
export function incomeSettled(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
): boolean {
  if (closedMonth(data, month)) return true;
  if (isFuture(month, now)) return false;
  if (data.settings.doneMonths[month]) return true;
  return daysLeft(month, now) === 0;
}

/**
 * What the month is working with.
 *
 * While it is still running, plan against the larger of what
 * arrived and what is typical, so a partly paid month does not
 * shrink every envelope prematurely.
 */
export function baseOf(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
): number {
  const closed = closedMonth(data, month);
  if (closed) return closed.income;

  const got = incomeOf(data, month);
  if (incomeSettled(data, month, now)) {
    return got > 0 ? got : plannedIncome(data);
  }
  return Math.max(got, plannedIncome(data));
}

/** Money carried in from last month, when leftovers roll. */
export function rollIn(data: BudgetData, month: string): number {
  if (data.settings.leftovers !== "roll") return 0;
  const prev = closedMonth(data, shiftMonth(month, -1));
  return prev?.rolled ?? 0;
}

/** Every month worth offering, including twelve ahead. */
export function allMonths(data: BudgetData, now: Date = new Date()): string[] {
  const set = new Set<string>();
  data.closedMonths.forEach((c) => set.add(c.month));
  data.transactions.forEach((t) => set.add(t.date.slice(0, 7)));
  set.add(thisMonth(now));
  for (let i = 1; i <= 12; i++) set.add(shiftMonth(thisMonth(now), i));
  return [...set].sort();
}
