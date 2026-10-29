/**
 * Turns a month into something worth saying.
 *
 * The wording lives in messages.ts. This decides which of those
 * slots the situation actually is, and hands over the figures
 * already formatted so no phrasing ever does arithmetic.
 *
 * The order is the same one the rest of the app uses: money
 * already lost, then money about to leave, then what is left,
 * then nothing at all.
 */

import type { BudgetData, MonthStats, Tone } from "@/types/budget";
import { phrase, partOfDay, type PartOfDay, type Slot } from "./messages";

export interface Spoken {
  id: string;
  slot: Slot;
  tone: Tone;
  /** the closed island */
  short: string;
  /** the expanded panel */
  long: string;
  /** the figure inside the short line, so it can count */
  value?: number;
  prefix?: string;
  suffix?: string;
}

function money(n: number, currency: string) {
  return `${Math.round(n).toLocaleString("en-US")} ${currency}`;
}

/** a stable number for the day, so the wording holds still */
function seedFor(now: Date) {
  return now.getFullYear() * 1000 + now.getMonth() * 40 + now.getDate();
}

export function speak(
  data: BudgetData,
  st: MonthStats,
  opts: { currency?: string; now?: Date; part?: PartOfDay } = {},
): Spoken {
  const currency = opts.currency ?? "DH";
  const now = opts.now ?? new Date();
  const part = opts.part ?? partOfDay(now);
  const seed = seedFor(now);
  const say = (slot: Slot, facts: Parameters<typeof phrase>[1]) =>
    phrase(slot, facts, { part, seed });

  /* nothing set up yet */
  const empty =
    (data.settings.income ?? 0) <= 0 &&
    !data.bills.length &&
    !data.envelopes.some((e) => e.pct > 0);
  if (empty) {
    const m = say("setup", {});
    return { id: "setup", slot: "setup", tone: "neutral", ...m };
  }

  /* 1, money already spent that should not have been */
  const over = st.envRows
    .filter((e) => e.status === "over")
    .sort((a, b) => b.spent - b.planned - (a.spent - a.planned));
  if (over.length) {
    const worst = over[0];
    const by = worst.spent - worst.planned;
    const m = say("overspent", {
      name: worst.name,
      amount: money(by, currency),
    });
    return { id: `over-${worst.id}`, slot: "overspent", tone: "bad", ...m };
  }

  /* 2, money about to leave */
  const today = st.daysTotal - st.daysLeft + 1;
  const due = st.billRows
    .filter((b) => !b.paid && b.amount > 0)
    .map((b) => ({
      ...b,
      inDays: Math.min(Math.max(1, b.dueDay), st.daysTotal) - today,
    }))
    .filter((b) => b.inDays >= 0 && b.inDays <= 4)
    .sort((a, b) => a.inDays - b.inDays);

  if (due.length) {
    const next = due[0];
    const amount = money(next.amount, currency);
    if (next.inDays <= 0) {
      const m = say("billToday", { name: next.name, amount });
      return { id: `bill-${next.id}`, slot: "billToday", tone: "warn", ...m };
    }
    const when = weekdayIn(now, next.inDays);
    const m = say("billSoon", {
      name: next.name,
      amount,
      days: next.inDays,
      when,
    });
    return { id: `bill-${next.id}`, slot: "billSoon", tone: "warn", ...m };
  }

  /* 3, the last stretch of the month */
  if (st.daysLeft > 0 && st.daysLeft <= 5 && !st.closed && !st.future) {
    const m = say("monthEnd", {
      days: st.daysLeft,
      amount: money(st.leftToSpend, currency),
    });
    return { id: "month-end", slot: "monthEnd", tone: "good", ...m };
  }

  /* 4, what is free today */
  if (st.perDay > 0 && !st.closed && !st.future) {
    const amount = money(st.perDay, currency);
    const m = say("free", { amount });
    /* the figure is pulled out so it can count rather than cut */
    const at = m.short.indexOf(amount);
    return {
      id: "free",
      slot: "free",
      tone: "good",
      ...m,
      ...(at >= 0
        ? {
            value: Math.round(st.perDay),
            prefix: m.short.slice(0, at),
            suffix: m.short.slice(at + amount.length),
          }
        : {}),
    };
  }

  const m = say("calm", {});
  return { id: "calm", slot: "calm", tone: "good", ...m };
}

/** The name of the day a bill lands on, for "on Friday". */
function weekdayIn(now: Date, days: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-GB", { weekday: "long" });
}
