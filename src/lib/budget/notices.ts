/**
 * Everything the app wants to tell you, in one ranked list.
 * The bell shows the count, the dashboard shows the worst two.
 */

import type { BudgetData, MonthStats, Tone } from "@/types/budget";
import { capNotes } from "./stats";
import { taxState } from "./tax";
import { shiftMonth, thisMonth, closedMonth, transactionsIn } from "./timing";

export interface Notice {
  id: string;
  tone: Tone;
  icon: string;
  title: string;
  text: string;
  action: string;
  month?: string;
}

/** A finished month should be closed, and the app should say so. */
export function closePrompt(data: BudgetData, now: Date = new Date()) {
  const prev = shiftMonth(thisMonth(now), -1);
  if (closedMonth(data, prev)) return null;
  if (!transactionsIn(data, prev).length) return null;
  return { month: prev };
}

/**
 * The whole system depends on logging. If nothing has been
 * entered for days the figures are quietly wrong, and saying so
 * is better than showing a confident wrong number.
 */
export function loggingGap(
  data: BudgetData,
  skippedDays: string[],
  now: Date = new Date(),
) {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (skippedDays.includes(today)) return null;

  const real = data.transactions.filter((t) => !t.isSample && !t.isAuto).map((t) => t.date);
  const all = [...real, ...skippedDays].sort();
  const last = all[all.length - 1];
  if (!last) return null;

  const [y, m, d] = last.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const days = Math.floor((new Date(today).getTime() - then.getTime()) / 86400000);
  if (days < 2) return null;

  const dayName = then.toLocaleDateString("en-GB", { weekday: "long" });
  return {
    days,
    text:
      days <= 6
        ? `Nothing logged since ${dayName}. These numbers may be too high.`
        : `Nothing logged for ${days} days. These numbers may be too high.`,
  };
}

export function notices(
  data: BudgetData,
  st: MonthStats,
  opts: { skippedDays?: string[]; backupDays?: number | null; currency?: string } = {},
): Notice[] {
  const out: Notice[] = [];
  const currency = opts.currency ?? "DH";
  const fmt = (n: number) => `${Math.round(n).toLocaleString("en-US")} ${currency}`;

  const close = closePrompt(data);
  if (close) {
    const name = close.month;
    out.push({
      id: "close", tone: "warn", icon: "archive",
      title: `${name} is over`,
      text: "Close it to save it into History.",
      action: "close", month: close.month,
    });
  }

  const gap = loggingGap(data, opts.skippedDays ?? []);
  if (gap) {
    out.push({
      id: "gap", tone: "warn", icon: "alert-circle",
      title: "Nothing logged recently", text: gap.text, action: "nospend",
    });
  }

  for (const r of st.over) {
    out.push({
      id: `over:${r.id}`, tone: "bad", icon: "trending-up",
      title: `${r.name} is over`,
      text: `${fmt(-r.left)} past its ${fmt(r.planned)} budget. Rebalance can fix it.`,
      action: "rebalance",
    });
  }

  const tx = taxState(data, st.month);
  if (!tx.ok && tx.left > 0) {
    out.push({
      id: "tax", tone: "bad", icon: "percent",
      title: "Tax reserve is short",
      text: `${fmt(tx.short)} less than you will owe for ${tx.year}.`,
      action: "tax",
    });
  }

  const backup = opts.backupDays;
  if (backup === null || (backup !== undefined && backup >= 14)) {
    out.push({
      id: "backup", tone: "warn", icon: "arrow-down-to-line",
      title: "No recent backup",
      text: backup === null
        ? "No backup yet. Everything is on this device only."
        : `Last backup ${backup} days ago.`,
      action: "backup",
    });
  }

  if (Math.abs(st.unassigned) > 1) {
    out.push({
      id: "split", tone: "warn", icon: "pie-chart",
      title: st.unassigned > 0 ? "Money is unassigned" : "The split is over 100%",
      text: `${fmt(Math.abs(st.unassigned))} ${st.unassigned > 0 ? "has no envelope" : "more than you have"}.`,
      action: "setup",
    });
  }

  /* good news last, so it never pushes a problem off the list */
  capNotes(data, st, currency).forEach((text, i) => {
    out.push({
      id: `cap${i}`, tone: "good", icon: "check-circle-2",
      title: "An envelope finished", text, action: "envelopes",
    });
  });

  const rank: Record<Tone, number> = { bad: 0, warn: 1, good: 2, neutral: 3 };
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

export function noticeCount(list: Notice[]): number {
  return list.filter((n) => n.tone !== "good").length;
}
