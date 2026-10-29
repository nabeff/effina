/**
 * The one line the closed island shows.
 *
 * Eight signals compete for a strip of text about forty
 * characters wide, so something has to choose. That choice is
 * here, as plain data in and plain data out, because a rule
 * about whose money needs attention first should be testable
 * without a browser.
 *
 * The order is money already lost, then money about to leave,
 * then what is left to spend, then nothing at all.
 */

import type { BudgetData, MonthStats, Tone } from "@/types/budget";

export interface Line {
  id: string;
  tone: Tone;
  /** the whole line, for a reader and for tests */
  text: string;
  /** the part before the figure, if there is one */
  prefix?: string;
  /** the figure itself, so it can count rather than cut */
  value?: number;
  /** what follows it */
  suffix?: string;
}

function money(n: number, currency: string) {
  return `${Math.round(n).toLocaleString("en-US")} ${currency}`;
}

export function islandLine(
  data: BudgetData,
  st: MonthStats,
  opts: { currency?: string; now?: Date } = {},
): Line {
  const currency = opts.currency ?? "DH";
  const now = opts.now ?? new Date();

  /* an account with nothing in it has nothing to report, and
     saying "all good" about an empty budget is a small lie */
  const empty =
    (data.settings.income ?? 0) <= 0 &&
    !data.bills.length &&
    !data.envelopes.some((e) => e.pct > 0);
  if (empty) {
    return { id: "setup", tone: "neutral", text: "Set up your budget" };
  }

  /* 1, money already spent that should not have been */
  const over = st.envRows
    .filter((e) => e.status === "over")
    .sort((a, b) => b.spent - b.planned - (a.spent - a.planned));
  if (over.length) {
    const worst = over[0];
    const by = worst.spent - worst.planned;
    return {
      id: `over-${worst.id}`,
      tone: "bad",
      text: `${worst.name} over by ${money(by, currency)}`,
      prefix: `${worst.name} over by `,
      value: Math.round(by),
      suffix: ` ${currency}`,
    };
  }

  /* 2, money about to leave within two days */
  const today = st.daysTotal - st.daysLeft + 1;
  const due = st.billRows
    .filter((b) => !b.paid && b.amount > 0)
    .map((b) => ({
      ...b,
      inDays: Math.min(Math.max(1, b.dueDay), st.daysTotal) - today,
    }))
    .filter((b) => b.inDays >= 0 && b.inDays <= 2)
    .sort((a, b) => a.inDays - b.inDays);

  if (due.length) {
    const next = due[0];
    const when =
      next.inDays <= 0
        ? "today"
        : next.inDays === 1
          ? "tomorrow"
          : `in ${next.inDays} days`;
    return {
      id: `bill-${next.id}`,
      tone: "warn",
      text: `${next.name} ${when}`,
    };
  }

  /* 3, what is actually free to spend today */
  if (st.perDay > 0 && !st.closed && !st.future) {
    return {
      id: "free",
      tone: "good",
      text: `${money(st.perDay, currency)} free today`,
      prefix: "",
      value: Math.round(st.perDay),
      suffix: ` ${currency} free today`,
    };
  }

  void now;
  return { id: "calm", tone: "good", text: "All good today" };
}
