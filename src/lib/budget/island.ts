/**
 * What the island should say right now.
 *
 * The header pill can only ever show one line, so something has
 * to decide which of eight possible things matters most. That
 * decision is here, as plain data in and plain data out, because
 * a rule about whose money needs attention first should be
 * testable without a browser.
 *
 * The order is fixed and deliberate: money already lost comes
 * before money about to leave, which comes before a warning
 * about the rest of the month, which comes before good news.
 */

import type { BudgetData, MonthStats, Tone } from "@/types/budget";
import { paceState } from "./split";
import { goalState } from "./goals";
import { taxState } from "./tax";
import { daysLeft } from "./timing";

export type SignalKind =
  | "overspent"
  | "bill"
  | "pace"
  | "income"
  | "renewal"
  | "tax"
  | "goal"
  | "sync"
  | "calm";

export interface Signal {
  id: string;
  kind: SignalKind;
  tone: Tone;
  icon: string;
  /** the one line the pill shows, kept short enough to fit */
  line: string;
  /** the fuller sentence the expanded panel shows */
  detail: string;
  /** 0 to 1, for a progress ring. Absent means no ring. */
  progress?: number;
  /** where tapping it should take you */
  href?: string;
  /** lower sorts first */
  rank: number;
}

/** Bills whose name says they repeat on their own. */
const RENEWAL = /subscription|renewal|insurance|netflix|spotify|licen[cs]e|membership|hosting|domain/i;

function money(n: number, currency: string) {
  return `${Math.round(n).toLocaleString("en-US")} ${currency}`;
}

/**
 * Every signal worth showing, most urgent first.
 *
 * Returns a calm line rather than nothing when all is well,
 * because an empty island would read as broken.
 */
export function signals(
  data: BudgetData,
  st: MonthStats,
  opts: { currency?: string; now?: Date; syncing?: boolean } = {},
): Signal[] {
  const currency = opts.currency ?? "DH";
  const now = opts.now ?? new Date();
  const out: Signal[] = [];

  /* a sync in flight outranks everything, because it is the one
     thing that is happening rather than merely true */
  if (opts.syncing) {
    out.push({
      id: "sync",
      kind: "sync",
      tone: "neutral",
      icon: "refresh-cw",
      line: "Syncing",
      detail: "Bringing this device up to date.",
      rank: -1,
    });
  }

  /* 1, money already spent that should not have been */
  const over = st.envRows
    .filter((e) => e.status === "over")
    .sort((a, b) => b.spent - b.planned - (a.spent - a.planned));
  if (over.length) {
    const worst = over[0];
    const by = worst.spent - worst.planned;
    out.push({
      id: `over-${worst.id}`,
      kind: "overspent",
      tone: "bad",
      icon: "alert-circle",
      line:
        over.length > 1
          ? `${over.length} envelopes over`
          : `${worst.name} over by ${money(by, currency)}`,
      detail:
        over.length > 1
          ? `${over.length} envelopes have gone past their share. ${worst.name} is the furthest, by ${money(by, currency)}.`
          : `${worst.name} has gone ${money(by, currency)} past its share this month.`,
      href: "/rebalance",
      rank: 0,
    });
  }

  /* 2, money about to leave in the next day. Counted in whole
     days from today to the due day, so "tomorrow" means
     tomorrow rather than any time in the next 24 hours. */
  const today = st.daysTotal - st.daysLeft + 1;
  const due = st.billRows
    .filter((b) => !b.paid && b.amount > 0)
    .map((b) => ({
      ...b,
      inDays: Math.min(Math.max(1, b.dueDay), st.daysTotal) - today,
    }))
    .filter((b) => b.inDays >= 0);

  const soon = due
    .filter((b) => b.inDays <= 1)
    .sort((a, b) => a.inDays - b.inDays);
  if (soon.length) {
    const next = soon[0];
    const when = next.inDays <= 0 ? "today" : "tomorrow";
    out.push({
      id: `bill-${next.id}`,
      kind: "bill",
      tone: "warn",
      icon: "file-text",
      line:
        soon.length > 1
          ? `${soon.length} bills due ${when}`
          : `${next.name} due ${when}`,
      detail:
        soon.length > 1
          ? `${soon.length} bills are due ${when}, ${money(soon.reduce((a, b) => a + b.amount, 0), currency)} in total.`
          : `${next.name} is due ${when}, ${money(next.amount, currency)}.`,
      href: "/bills",
      rank: 1,
    });
  }

  /* 3, the shape of the rest of the month */
  const pace = paceState(st);
  if (pace.tone !== "good" && !st.closed && !st.future) {
    out.push({
      id: "pace",
      kind: "pace",
      tone: pace.tone,
      icon: "gauge",
      line: pace.label,
      detail: `You are ${Math.round(pace.used)} percent through the money and ${Math.round(pace.through)} percent through the month.`,
      progress: Math.min(1, pace.used / 100),
      href: "/",
      rank: 2,
    });
  }

  /* 4, money that arrived */
  if (st.income > 0 && st.settled) {
    out.push({
      id: "income",
      kind: "income",
      tone: "good",
      icon: "arrow-down-left",
      line: `${money(st.income, currency)} in`,
      detail: `${money(st.income, currency)} has come in this month, with ${money(st.flex, currency)} to spend after bills.`,
      href: "/log",
      rank: 3,
    });
  }

  /* 5, things that renew on their own */
  const renewals = due.filter((b) => RENEWAL.test(b.name) && b.inDays <= 7);
  if (renewals.length) {
    const next = renewals[0];
    out.push({
      id: `renewal-${next.id}`,
      kind: "renewal",
      tone: "neutral",
      icon: "repeat",
      line: `${next.name} renews soon`,
      detail: `${next.name} renews in ${next.inDays} days, ${money(next.amount, currency)}. Cancel it before then if you do not want it.`,
      href: "/bills",
      rank: 4,
    });
  }

  /* 6, what is owed to somebody who will ask for it */
  const tax = taxState(data, st.month, now);
  if (tax.left > 0 && tax.short > 0) {
    out.push({
      id: "tax",
      kind: "tax",
      tone: "warn",
      icon: "percent",
      line: `${money(tax.short, currency)} short on tax`,
      detail: `You owe ${money(tax.left, currency)} and have set aside ${money(tax.aside, currency)}.`,
      progress: Math.min(1, tax.covered / 100),
      href: "/tax",
      rank: 5,
    });
  }

  /* 7, the good news, last */
  for (const g of data.goals) {
    const gs = goalState(data, g, now);
    const pct = gs.pct / 100;
    if (pct >= 0.8 && !gs.done) {
      out.push({
        id: `goal-${g.id}`,
        kind: "goal",
        tone: "good",
        icon: "target",
        line: `${g.name} ${Math.round(pct * 100)} percent there`,
        detail: `${money(gs.left, currency)} left on ${g.name}.`,
        progress: pct,
        href: "/goals",
        rank: 6,
      });
      break;
    }
  }

  out.sort((a, b) => a.rank - b.rank);

  if (!out.length) {
    const left = daysLeft(st.month, now);
    out.push({
      id: "calm",
      kind: "calm",
      tone: "good",
      icon: "check",
      line: "All good today",
      detail:
        st.perDay > 0
          ? `${money(st.perDay, currency)} a day for the next ${left} days.`
          : "Nothing needs you right now.",
      rank: 9,
    });
  }

  return out;
}

/**
 * The two the idle pill rotates through.
 *
 * Never more than two, because a line that changes four times
 * before you have read it is worse than one that does not change
 * at all.
 */
export function idleRotation(all: Signal[]): Signal[] {
  return all.slice(0, 2);
}
