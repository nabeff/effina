/**
 * The month.
 *
 * Bills come out in exact dirhams, the remainder is split by
 * percentage. That is the whole model, and everything on every
 * screen is derived from this one function.
 */

import type {
  BudgetData, MonthStats, BillRow, EnvelopeRow, EnvelopeStatus,
} from "@/types/budget";
import {
  baseOf, closedMonth, daysInMonth, daysLeft, incomeOf, isFuture,
  incomeSettled, plannedIncome, rollIn, transactionsIn,
} from "./timing";

export function billTotal(data: BudgetData): number {
  return data.bills.reduce((a, b) => a + (b.amount || 0), 0);
}

export function totalPct(data: BudgetData): number {
  return data.envelopes.reduce((a, e) => a + (e.pct || 0), 0);
}

/** Net money moved in or out of an envelope by rebalancing. */
export function transferNet(
  data: BudgetData,
  month: string,
  envelopeId: string,
): number {
  return data.transfers
    .filter((t) => t.month === month)
    .reduce((a, t) => {
      if (t.toEnvelope === envelopeId) return a + t.amount;
      if (t.fromEnvelope === envelopeId) return a - t.amount;
      return a;
    }, 0);
}

/* ============================================================
   CAPS
   Two envelopes have a finish line. The emergency fund stops at
   three months of bills, and a debt stops at zero. What they no
   longer need goes to Savings, so the money keeps a job rather
   than quietly inflating the spending envelopes.
   ============================================================ */

export function emergencyTarget(data: BudgetData): number {
  return billTotal(data) * 3;
}

/** Everything already banked in the emergency fund. */
export function emergencySaved(data: BudgetData, before: string): number {
  const emg = data.envelopes.find((e) => e.id.endsWith("emg") || e.name.toLowerCase().includes("emergency"));
  if (!emg) return 0;
  return data.closedMonths
    .filter((c) => c.month < before)
    .reduce((a, c) => a + (c.perEnvelope[emg.id] ?? 0), 0);
}

export function debtPaidTotal(data: BudgetData): number {
  const debt = data.envelopes.find((e) => e.kind === "debt");
  const before = data.settings.debtPaidBefore || 0;
  if (!debt) return before;

  const closedKeys = new Set(data.closedMonths.map((c) => c.month));
  const fromClosed = data.closedMonths.reduce((a, c) => a + c.debtPaid, 0);
  const live = data.transactions
    .filter(
      (t) =>
        t.direction === "out" &&
        t.envelopeId === debt.id &&
        !closedKeys.has(t.date.slice(0, 7)),
    )
    .reduce((a, t) => a + t.amount, 0);

  return before + fromClosed + live;
}

interface Caps {
  capped: Record<string, number>;
  toSavings: number;
}

function capState(data: BudgetData, month: string, flex: number, tp: number): Caps {
  const capped: Record<string, number> = {};
  let toSavings = 0;

  for (const e of data.envelopes) {
    const rawShare = (flex * (e.pct || 0)) / tp;
    if (rawShare <= 0) continue;

    const isEmergency =
      e.kind === "save" && e.name.toLowerCase().includes("emergency");

    if (isEmergency) {
      const room = Math.max(0, emergencyTarget(data) - emergencySaved(data, month));
      if (room < rawShare) {
        capped[e.id] = room;
        toSavings += rawShare - room;
      }
    }

    if (e.kind === "debt") {
      const owed = Math.max(0, (data.settings.debtTotal || 0) - debtPaidTotal(data));
      if (owed < rawShare) {
        capped[e.id] = owed;
        toSavings += rawShare - owed;
      }
    }
  }

  return { capped, toSavings };
}

/** A plain sentence for any cap that fired, or nothing. */
export function capNotes(data: BudgetData, st: MonthStats, currency = "DH"): string[] {
  const out: string[] = [];
  const fmt = (n: number) => `${Math.round(n).toLocaleString("en-US")} ${currency}`;

  const debt = st.envRows.find((r) => r.kind === "debt" && r.capped);
  if (debt) {
    const freed = debt.rawShare - debt.share;
    if (freed > 1) out.push(`${debt.name} is paid off. ${fmt(freed)} a month moves to Savings.`);
  }

  const emg = st.envRows.find(
    (r) => r.capped && r.name.toLowerCase().includes("emergency"),
  );
  if (emg) {
    const freed = emg.rawShare - emg.share;
    if (freed > 1) {
      out.push(
        `Emergency fund is full at ${fmt(emergencyTarget(data))}. ${fmt(freed)} a month moves to Savings.`,
      );
    }
  }

  return out;
}

/* ============================================================
   THE MONTH
   ============================================================ */

export function stats(
  data: BudgetData,
  month: string,
  now: Date = new Date(),
): MonthStats {
  const closed = closedMonth(data, month);
  const bt = billTotal(data);
  const base = baseOf(data, month, now);
  const carried = rollIn(data, month);
  const income = incomeOf(data, month);
  const planned = plannedIncome(data);
  const settled = incomeSettled(data, month, now);
  const future = isFuture(month, now);

  /* A lean month cannot pay its bills from what came in. The gap
     comes out of the emergency fund, which is what it is for. */
  const lean = settled && income > 0 && income < bt;
  const leanGap = lean ? bt - income : 0;

  const flex = Math.max(0, base - bt) + carried;
  const tp = totalPct(data) || 1;
  const txs = transactionsIn(data, month);
  const caps = capState(data, month, flex, tp);

  const savings = data.envelopes.find(
    (e) => e.kind === "save" && e.name.toLowerCase().includes("saving"),
  );

  const billRows: BillRow[] = data.bills.map((b) => {
    const spent = txs
      .filter((t) => t.direction === "out" && t.billId === b.id)
      .reduce((a, t) => a + t.amount, 0);
    return {
      ...b,
      planned: b.amount,
      spent,
      paid: spent >= b.amount - 0.5,
    };
  });

  const envRows: EnvelopeRow[] = data.envelopes.map((e) => {
    const rawShare = (flex * (e.pct || 0)) / tp;
    const share =
      savings && e.id === savings.id
        ? rawShare + caps.toSavings
        : caps.capped[e.id] ?? rawShare;

    const moved = transferNet(data, month, e.id);
    const isEmergency = e.name.toLowerCase().includes("emergency");
    const leanHit = lean && isEmergency ? leanGap : 0;
    const planned = Math.max(0, share + moved - leanHit);

    const spent = txs
      .filter((t) => t.direction === "out" && t.envelopeId === e.id)
      .reduce((a, t) => a + t.amount, 0);

    const left = planned - spent;
    const pctUsed = planned > 0 ? (spent / planned) * 100 : spent > 0 ? 999 : 0;

    /* One rule everywhere: orange at 80 percent used, red when over. */
    const status: EnvelopeStatus =
      left < -0.5 ? "over" : pctUsed >= 80 ? "close" : "ok";

    return {
      ...e, rawShare, share, moved, leanHit, planned, spent, left,
      pctUsed, status, capped: caps.capped[e.id] !== undefined,
    };
  });

  const billsPaid = billRows.reduce((a, b) => a + b.spent, 0);
  const spentFlex = envRows.reduce((a, r) => a + r.spent, 0);
  const inSavePots = envRows
    .filter((r) => r.kind === "save")
    .reduce((a, r) => a + Math.max(0, r.planned), 0);

  const spent = closed ? closed.spent : billsPaid + spentFlex;
  const saved = closed ? closed.saved : inSavePots;

  const leftToSpend = envRows
    .filter((r) => r.kind === "spend")
    .reduce((a, r) => a + Math.max(0, r.left), 0);

  const dLeft = daysLeft(month, now);
  const dTotal = daysInMonth(month);

  return {
    month, base, flex, billTotal: bt, income, planned, carried,
    settled, future, closed: !!closed, lean, leanGap,
    spent, saved, leftToSpend,
    billRows, envRows,
    billsPaid, spentFlex, inSavePots,
    daysLeft: dLeft, daysTotal: dTotal,
    perDay: dLeft > 0 ? leftToSpend / dLeft : 0,
    over: envRows.filter((r) => r.status === "over"),
    unassigned: flex - envRows.reduce((a, r) => a + r.share, 0),
    transactions: txs,
  };
}
