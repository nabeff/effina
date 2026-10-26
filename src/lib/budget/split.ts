/**
 * Where the month's money sits, in parts that always add up to
 * what came in. Nothing is hidden and nothing is double counted.
 */

import type { BudgetData, MonthStats, SplitPart, PaceState } from "@/types/budget";

export function splitParts(st: MonthStats): SplitPart[] {
  const bills = st.billTotal;
  const debt = st.envRows
    .filter((r) => r.kind === "debt")
    .reduce((a, r) => a + r.spent, 0);
  const spent = st.envRows
    .filter((r) => r.kind === "spend")
    .reduce((a, r) => a + r.spent, 0);
  const kept = st.envRows
    .filter((r) => r.kind === "save")
    .reduce((a, r) => a + Math.max(0, r.planned), 0);

  const used = bills + spent + debt + kept;
  const free = Math.max(0, st.base - used);
  const over = Math.max(0, used - st.base);

  const parts: SplitPart[] = [
    { key: "bills", name: "Bills", amount: bills, hue: "muted" },
    { key: "spent", name: "Spent", amount: spent, hue: "orange" },
    { key: "debt", name: "Paid to dad", amount: debt, hue: "pink" },
    { key: "kept", name: "Kept", amount: kept, hue: "green" },
    { key: "free", name: "Still available", amount: free, hue: "teal" },
  ];

  if (over > 0.5) {
    parts.push({ key: "over", name: "Over income", amount: over, hue: "pink" });
  }

  return parts;
}

/** How much of the spending pot has gone. */
export function spendPotUsedPct(st: MonthStats): number {
  const rows = st.envRows.filter((r) => r.kind !== "save");
  const planned = rows.reduce((a, r) => a + r.planned, 0);
  const spent = rows.reduce((a, r) => a + r.spent, 0);
  if (planned <= 0) return spent > 0 ? 100 : 0;
  return Math.round((spent / planned) * 100);
}

/**
 * How fast you are going, in one word. Comparing money spent
 * against days passed is the only honest way to say it, because
 * halfway through the month you should be halfway through the pot.
 */
export function paceState(st: MonthStats): PaceState {
  const through =
    st.daysTotal > 0 ? ((st.daysTotal - st.daysLeft + 1) / st.daysTotal) * 100 : 100;
  const used = spendPotUsedPct(st);
  const gap = used - through;

  if (used > 100 || gap > 18) return { label: "Too fast", tone: "bad", through, used, gap };
  if (gap > 7) return { label: "A bit fast", tone: "warn", through, used, gap };
  return { label: "On track", tone: "good", through, used, gap };
}

/** What has gone out today against what today is worth. */
export function todayState(data: BudgetData, st: MonthStats, today: string) {
  const spent = data.transactions
    .filter((t) => t.direction === "out" && t.date === today && !t.billId)
    .reduce((a, t) => a + t.amount, 0);

  const allowance = st.perDay;
  const pct = allowance > 0 ? Math.min(100, (spent / allowance) * 100) : spent > 0 ? 100 : 0;

  return { spent, allowance, pct, over: allowance > 0 && spent > allowance + 0.5 };
}

/** What one more purchase would do to the daily figure. */
export function affordState(st: MonthStats, amount: number) {
  const amt = Math.max(0, amount || 0);
  const left = st.leftToSpend - amt;
  const days = st.daysLeft;
  return {
    amount: amt,
    left,
    days,
    perDay: days > 0 ? left / days : 0,
    tight: left < 0,
  };
}
